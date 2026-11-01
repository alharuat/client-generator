import { Prisma, type Lead, type LeadStatus } from "@prisma/client";
import { prisma } from "../db";
import { AppError } from "../core/errors";
import { createLogger } from "../core/logger";
import { identityFields, normalizePhone, websiteDomain, normalizeText } from "./dedupe";
import { classifyProspect, preliminaryScore, priorityFromScore } from "./scoring";
import { leadCreateSchema, leadFilterSchema, leadUpdateSchema, type LeadCreateInput, type LeadFilter, type LeadUpdateInput } from "./schemas";
import { approvalRequiredFor, canTransition } from "./status";
import { STATUS_LABEL } from "./constants";
import { requestApproval } from "../approvals/service";

const log = createLogger("leads");

export async function findDuplicates(i: { name: string; city?: string | null; phone?: string | null; websiteUrl?: string | null; googlePlaceId?: string | null }, excludeId?: string) {
  const ors: Prisma.LeadWhereInput[] = [{ dedupeKey: identityFields(i).dedupeKey }];
  if (i.googlePlaceId) ors.push({ googlePlaceId: i.googlePlaceId });
  const phone = normalizePhone(i.phone);
  if (phone) ors.push({ phoneNormalized: phone });
  const domain = websiteDomain(i.websiteUrl);
  if (domain) ors.push({ websiteDomain: domain });
  const candidates = await prisma.lead.findMany({
    where: { OR: ors, ...(excludeId ? { id: { not: excludeId } } : {}) },
    take: 10,
  });
  // A name-only match also counts when the city matches.
  const nameKey = normalizeText(i.name);
  const byName = nameKey
    ? await prisma.lead.findMany({ where: { name: { equals: i.name.trim(), mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) }, take: 10 })
    : [];
  const sameCity = byName.filter((l) => normalizeText(l.city) === normalizeText(i.city));
  const seen = new Set<string>();
  return [...candidates, ...sameCity].filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
}

export async function createLead(raw: LeadCreateInput, actor = "system"): Promise<Lead> {
  const input = leadCreateSchema.parse(raw);
  const dupes = await findDuplicates(input);
  if (dupes.length) {
    throw new AppError("DUPLICATE", `"${input.name}" looks like an existing lead: ${dupes[0].name}.`, { duplicateIds: dupes.map((d) => d.id) });
  }
  const prospectType = classifyProspect({ websiteUrl: input.websiteUrl, prospectType: input.prospectType as Lead["prospectType"] | undefined });
  const score = preliminaryScore({ ...input, prospectType });
  try {
    const lead = await prisma.lead.create({
      data: {
        ...input,
        category: input.category as Lead["category"],
        prospectType,
        score,
        priority: priorityFromScore(score),
        ...identityFields(input),
        activities: { create: { type: "created", message: `Lead created from ${input.source.toLowerCase().replace("_", " ")}`, actor, toStatus: "NEW_LEAD" } },
      },
    });
    log.info("lead created", { id: lead.id, score });
    return lead;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError("DUPLICATE", `"${input.name}" already exists.`);
    }
    throw e;
  }
}

export async function getLead(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignee: true,
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      approvals: { orderBy: { createdAt: "desc" } },
      project: { include: { tasks: { orderBy: { order: "asc" } } } },
      websites: true,
    },
  });
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found");
  return lead;
}

export async function updateLead(id: string, raw: LeadUpdateInput, actor = "system"): Promise<Lead> {
  const input = leadUpdateSchema.parse(raw);
  const current = await prisma.lead.findUnique({ where: { id } });
  if (!current) throw new AppError("NOT_FOUND", "Lead not found");

  const merged = { ...current, ...input } as Lead;
  const identityChanged = ["name", "city", "phone", "websiteUrl", "googlePlaceId"].some((k) => k in input);
  let identity = {};
  if (identityChanged) {
    const dupes = await findDuplicates(merged, id);
    if (dupes.length) throw new AppError("DUPLICATE", `This would duplicate ${dupes[0].name}.`, { duplicateIds: dupes.map((d) => d.id) });
    identity = identityFields(merged);
  }

  const changed = Object.keys(input).filter((k) => JSON.stringify((current as Record<string, unknown>)[k]) !== JSON.stringify((input as Record<string, unknown>)[k]));
  const data: Prisma.LeadUncheckedUpdateInput = { ...(input as Prisma.LeadUncheckedUpdateInput), ...identity };
  if ("assigneeId" in input && input.assigneeId === "") data.assigneeId = null;

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      activities: changed.length
        ? { create: { type: changed.includes("assigneeId") && changed.length === 1 ? "assigned" : "updated", message: `Updated ${changed.join(", ")}`, actor, metadata: { fields: changed } } }
        : undefined,
    },
  });
  return lead;
}

export async function addNote(id: string, message: string, actor = "system") {
  const text = message.trim();
  if (!text) throw new AppError("VALIDATION", "Note is empty");
  return prisma.leadActivity.create({ data: { leadId: id, type: "note", message: text.slice(0, 5000), actor } });
}

export type StatusChangeResult = { lead: Lead; approvalId?: string; pendingApproval: boolean };

/**
 * Move a lead through the pipeline. Gated transitions (qualify, contact,
 * start development) create a pending approval instead of moving the lead,
 * unless `approved` is set by the approval service itself.
 */
export async function changeLeadStatus(id: string, to: LeadStatus, opts: { actor?: string; note?: string; approved?: boolean } = {}): Promise<StatusChangeResult> {
  const actor = opts.actor ?? "system";
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found");
  if (!canTransition(lead.status, to)) {
    throw new AppError("INVALID_TRANSITION", `Cannot move from ${STATUS_LABEL[lead.status]} to ${STATUS_LABEL[to]}.`);
  }

  const gate = approvalRequiredFor(lead.status, to);
  if (gate && !opts.approved) {
    const approval = await requestApproval({
      action: gate,
      leadId: id,
      summary: `${STATUS_LABEL[to]}: ${lead.name}`,
      payload: { from: lead.status, to, note: opts.note ?? null },
      requestedBy: actor,
    });
    return { lead, approvalId: approval.id, pendingApproval: true };
  }

  const updated = await prisma.lead.update({
    where: { id, status: lead.status }, // optimistic concurrency: fails if someone moved it meanwhile
    data: {
      status: to,
      statusChangedAt: new Date(),
      activities: {
        create: {
          type: "status_changed",
          fromStatus: lead.status,
          toStatus: to,
          message: `${STATUS_LABEL[lead.status]} → ${STATUS_LABEL[to]}${opts.note ? `: ${opts.note}` : ""}`,
          actor,
        },
      },
    },
  }).catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new AppError("CONFLICT", "Lead was changed by someone else, reload and retry.");
    throw e;
  });
  return { lead: updated, pendingApproval: false };
}

export async function recomputeLeadScore(id: string) {
  const lead = await prisma.lead.findUnique({ where: { id }, include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found");
  // An AI analysis (Phase 3) takes precedence over the rule-based score.
  const score = lead.analyses[0]?.leadScore ?? preliminaryScore({ ...lead, socialLinks: lead.socialLinks as Record<string, unknown> });
  return prisma.lead.update({ where: { id }, data: { score, priority: priorityFromScore(score) } });
}

export function buildLeadWhere(f: LeadFilter): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { city: { contains: f.q, mode: "insensitive" } },
        { address: { contains: f.q, mode: "insensitive" } },
        { phone: { contains: f.q } },
        { email: { contains: f.q, mode: "insensitive" } },
        { websiteUrl: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.status) and.push({ status: f.status as LeadStatus });
  if (f.category) and.push({ category: f.category as Lead["category"] });
  if (f.prospectType) and.push({ prospectType: f.prospectType as Lead["prospectType"] });
  if (f.city) and.push({ city: { equals: f.city, mode: "insensitive" } });
  if (f.assigneeId) and.push({ assigneeId: f.assigneeId === "unassigned" ? null : f.assigneeId });
  if (f.noWebsite) and.push({ prospectType: "NO_WEBSITE" });
  if (f.minScore !== undefined) and.push({ score: { gte: f.minScore } });
  return and.length ? { AND: and } : {};
}

const ORDER: Record<LeadFilter["sort"], Prisma.LeadOrderByWithRelationInput[]> = {
  score: [{ score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  recent: [{ createdAt: "desc" }],
  name: [{ name: "asc" }],
  rating: [{ googleRating: { sort: "desc", nulls: "last" } }, { reviewCount: { sort: "desc", nulls: "last" } }],
};

export async function listLeads(raw: Partial<Record<keyof LeadFilter, unknown>> = {}) {
  const f = leadFilterSchema.parse(raw);
  const where = buildLeadWhere(f);
  const [items, total] = await prisma.$transaction([
    prisma.lead.findMany({ where, orderBy: ORDER[f.sort], skip: (f.page - 1) * f.pageSize, take: f.pageSize, include: { assignee: true } }),
    prisma.lead.count({ where }),
  ]);
  return { items, total, page: f.page, pageSize: f.pageSize, filter: f };
}
