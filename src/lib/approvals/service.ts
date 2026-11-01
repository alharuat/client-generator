import type { ApprovalAction, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AppError } from "../core/errors";
import { createLogger } from "../core/logger";

const log = createLogger("approvals");

export const ACTION_LABEL: Record<ApprovalAction, string> = {
  QUALIFY_LEAD: "Mark lead as qualified",
  CONTACT_BUSINESS: "Contact the business",
  CREATE_PROJECT: "Create client project",
  PUBLISH_WEBSITE: "Publish website to production",
  SHARE_CREDENTIALS: "Share admin credentials",
};

export interface ApprovalRequest {
  action: ApprovalAction;
  summary: string;
  leadId?: string;
  projectId?: string;
  websiteId?: string;
  payload?: Prisma.InputJsonValue;
  requestedBy?: string;
}

/** Idempotent: an identical pending request is returned instead of duplicated. */
export async function requestApproval(r: ApprovalRequest) {
  const existing = await prisma.approval.findFirst({
    where: { action: r.action, status: "PENDING", leadId: r.leadId ?? null, projectId: r.projectId ?? null, websiteId: r.websiteId ?? null },
  });
  if (existing) return existing;
  const approval = await prisma.approval.create({
    data: {
      action: r.action,
      summary: r.summary,
      leadId: r.leadId,
      projectId: r.projectId,
      websiteId: r.websiteId,
      payload: r.payload ?? {},
      requestedBy: r.requestedBy ?? "system",
    },
  });
  if (r.leadId) {
    await prisma.leadActivity.create({
      data: { leadId: r.leadId, type: "approval_requested", message: `Approval requested: ${ACTION_LABEL[r.action]}`, actor: r.requestedBy ?? "system", metadata: { approvalId: approval.id } },
    });
  }
  log.info("approval requested", { id: approval.id, action: r.action });
  return approval;
}

/**
 * Record a human decision and, when approved, perform the gated action.
 * Only this function may pass `approved: true` to the lead pipeline.
 */
export async function decideApproval(id: string, decision: "APPROVED" | "REJECTED", decidedBy: string, note?: string) {
  if (!decidedBy || decidedBy === "system") throw new AppError("VALIDATION", "Approvals must be decided by a person.");
  const approval = await prisma.approval.findUnique({ where: { id } });
  if (!approval) throw new AppError("NOT_FOUND", "Approval not found");
  if (approval.status !== "PENDING") throw new AppError("CONFLICT", `Already ${approval.status.toLowerCase()}.`);

  // Claim the decision atomically so two clicks cannot both apply it.
  const { count } = await prisma.approval.updateMany({
    where: { id, status: "PENDING" },
    data: { status: decision, decidedBy, decisionNote: note ?? null, decidedAt: new Date() },
  });
  if (count === 0) throw new AppError("CONFLICT", "Approval was decided by someone else.");

  if (approval.leadId) {
    await prisma.leadActivity.create({
      data: {
        leadId: approval.leadId,
        type: "approval_decided",
        message: `${ACTION_LABEL[approval.action]}: ${decision.toLowerCase()}${note ? ` (${note})` : ""}`,
        actor: decidedBy,
        metadata: { approvalId: id },
      },
    });
  }

  if (decision === "APPROVED") {
    try {
      await applyApproval(approval.action, approval.leadId, approval.payload as Record<string, unknown>, decidedBy);
    } catch (e) {
      // Roll the decision back so the gate can be retried.
      await prisma.approval.update({ where: { id }, data: { status: "PENDING", decidedBy: null, decidedAt: null, decisionNote: `Apply failed: ${e instanceof Error ? e.message : String(e)}` } });
      throw e;
    }
  }
  log.info("approval decided", { id, decision, by: decidedBy });
  return prisma.approval.findUniqueOrThrow({ where: { id } });
}

async function applyApproval(action: ApprovalAction, leadId: string | null, payload: Record<string, unknown>, actor: string) {
  // Imported lazily to avoid a circular import with the leads service.
  const { changeLeadStatus } = await import("../leads/service");
  const { createProjectForLead } = await import("../projects/service");
  const note = typeof payload.note === "string" ? payload.note : undefined;
  switch (action) {
    case "QUALIFY_LEAD":
    case "CONTACT_BUSINESS": {
      if (!leadId) throw new AppError("VALIDATION", "Approval has no lead");
      const to = (payload.to as LeadStatus) ?? (action === "QUALIFY_LEAD" ? "QUALIFIED" : "CONTACTED");
      await changeLeadStatus(leadId, to, { actor, note, approved: true });
      return;
    }
    case "CREATE_PROJECT": {
      if (!leadId) throw new AppError("VALIDATION", "Approval has no lead");
      await createProjectForLead(leadId);
      await changeLeadStatus(leadId, "IN_DEVELOPMENT", { actor, note, approved: true });
      return;
    }
    case "PUBLISH_WEBSITE":
    case "SHARE_CREDENTIALS":
      // Consumed by the deployment and delivery phases via hasApproval().
      return;
  }
}

/** True when a person approved `action` for the target. Deploy/delivery code must check this. */
export async function hasApproval(action: ApprovalAction, target: { leadId?: string; projectId?: string; websiteId?: string }) {
  const found = await prisma.approval.findFirst({ where: { action, status: "APPROVED", ...target } });
  return Boolean(found);
}

export async function listApprovals(status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "ALL" = "PENDING") {
  return prisma.approval.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
    include: { lead: { select: { id: true, name: true, city: true, score: true, status: true } } },
    take: 200,
  });
}
