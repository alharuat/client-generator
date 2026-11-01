"use server";

import type { LeadStatus, TaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { isAppError } from "@/lib/core/errors";
import { addNote, changeLeadStatus, createLead, updateLead } from "@/lib/leads/service";
import { decideApproval } from "@/lib/approvals/service";
import { updateTaskStatus } from "@/lib/projects/service";
import { enqueue } from "@/lib/workflow/jobs";
import { getActor } from "./actor";

function messageOf(e: unknown): string {
  if (isAppError(e)) return e.message;
  if (e instanceof ZodError) return e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
  console.error(e);
  return "Something went wrong. Check the server logs.";
}

function back(path: string, params: Record<string, string>): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${new URLSearchParams(params).toString()}`);
}

function str(fd: FormData, k: string): string | undefined {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function leadFields(fd: FormData) {
  const socialLinks: Record<string, string> = {};
  for (const k of ["instagram", "facebook", "tiktok", "whatsapp"]) {
    const v = str(fd, `social_${k}`);
    if (v) socialLinks[k] = v;
  }
  return {
    name: str(fd, "name") ?? "",
    category: str(fd, "category"),
    prospectType: str(fd, "prospectType"),
    city: str(fd, "city") ?? null,
    country: str(fd, "country") ?? null,
    neighborhood: str(fd, "neighborhood") ?? null,
    address: str(fd, "address") ?? null,
    phone: str(fd, "phone") ?? null,
    email: str(fd, "email") ?? null,
    websiteUrl: str(fd, "websiteUrl") ?? null,
    googleMapsUrl: str(fd, "googleMapsUrl") ?? null,
    googleRating: str(fd, "googleRating") ?? null,
    reviewCount: str(fd, "reviewCount") ?? null,
    notes: str(fd, "notes") ?? null,
    socialLinks,
  };
}

export async function createLeadAction(fd: FormData) {
  let id: string;
  try {
    const f = leadFields(fd);
    const lead = await createLead({ ...f, category: f.category ?? "OTHER", source: "MANUAL" } as never, await getActor());
    id = lead.id;
  } catch (e) {
    back("/discovery", { error: messageOf(e) });
  }
  revalidatePath("/", "layout");
  redirect(`/crm/${id}?ok=Lead+created`);
}

export async function updateLeadAction(id: string, fd: FormData) {
  try {
    const f = leadFields(fd);
    const prospectType = f.prospectType;
    const assigneeId = str(fd, "assigneeId") ?? null;
    const priority = str(fd, "priority");
    await updateLead(id, { ...f, prospectType, assigneeId, priority, category: f.category } as never, await getActor());
  } catch (e) {
    back(`/crm/${id}`, { error: messageOf(e) });
  }
  revalidatePath(`/crm/${id}`);
  back(`/crm/${id}`, { ok: "Saved" });
}

export async function changeStatusAction(id: string, fd: FormData) {
  let msg = "Status updated";
  try {
    const to = str(fd, "status") as LeadStatus;
    const res = await changeLeadStatus(id, to, { actor: await getActor(), note: str(fd, "note") });
    if (res.pendingApproval) msg = "Approval requested. The lead moves once the request is approved on the Approvals page.";
  } catch (e) {
    back(`/crm/${id}`, { error: messageOf(e) });
  }
  revalidatePath("/", "layout");
  back(`/crm/${id}`, { ok: msg });
}

export async function addNoteAction(id: string, fd: FormData) {
  try {
    await addNote(id, str(fd, "note") ?? "", await getActor());
  } catch (e) {
    back(`/crm/${id}`, { error: messageOf(e) });
  }
  revalidatePath(`/crm/${id}`);
  redirect(`/crm/${id}`);
}

export async function rescoreLeadAction(id: string) {
  await enqueue("lead.rescore", { leadId: id }, { dedupeKey: `rescore:${id}` });
  back(`/crm/${id}`, { ok: "Rescore queued. The worker picks it up within seconds." });
}

export async function decideApprovalAction(id: string, fd: FormData) {
  const decision = str(fd, "decision") === "APPROVED" ? "APPROVED" : "REJECTED";
  const returnTo = str(fd, "returnTo") ?? "/approvals";
  try {
    await decideApproval(id, decision, await getActor(), str(fd, "note"));
  } catch (e) {
    back(returnTo, { error: messageOf(e) });
  }
  revalidatePath("/", "layout");
  back(returnTo, { ok: decision === "APPROVED" ? "Approved and applied" : "Rejected" });
}

export async function updateTaskStatusAction(projectId: string, taskId: string, fd: FormData) {
  try {
    await updateTaskStatus(taskId, (str(fd, "status") ?? "TODO") as TaskStatus);
  } catch (e) {
    back(`/projects/${projectId}`, { error: messageOf(e) });
  }
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function addTeamMemberAction(fd: FormData) {
  try {
    const name = str(fd, "name");
    const email = str(fd, "email");
    if (!name || !email) throw new Error("Name and email are required");
    await prisma.teamMember.create({ data: { name, email: email.toLowerCase(), role: str(fd, "role") ?? "member" } });
  } catch (e) {
    back("/settings", { error: e instanceof Error && e.message.includes("Unique") ? "That email already exists" : messageOf(e) });
  }
  revalidatePath("/settings");
  back("/settings", { ok: "Team member added" });
}
