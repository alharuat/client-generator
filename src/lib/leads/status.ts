import type { ApprovalAction, LeadStatus } from "@prisma/client";

/** Forward moves allowed in the pipeline. REJECTED is reachable from any open status. */
const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW_LEAD: ["ANALYZED", "QUALIFIED"],
  ANALYZED: ["QUALIFIED", "NEW_LEAD"],
  QUALIFIED: ["CONTACTED", "ANALYZED"],
  CONTACTED: ["INTERESTED", "QUALIFIED"],
  INTERESTED: ["PROPOSAL_SENT", "CONTACTED"],
  PROPOSAL_SENT: ["ACCEPTED", "INTERESTED"],
  ACCEPTED: ["IN_DEVELOPMENT", "PROPOSAL_SENT"],
  IN_DEVELOPMENT: ["REVIEW"],
  REVIEW: ["DELIVERED", "IN_DEVELOPMENT"],
  DELIVERED: [],
  REJECTED: ["NEW_LEAD"],
};

/** Human approval checkpoints required by the automation rules. */
const APPROVAL_GATES: Partial<Record<LeadStatus, ApprovalAction>> = {
  QUALIFIED: "QUALIFY_LEAD",
  CONTACTED: "CONTACT_BUSINESS",
  IN_DEVELOPMENT: "CREATE_PROJECT",
};

export function allowedTransitions(from: LeadStatus): LeadStatus[] {
  const base = TRANSITIONS[from];
  if (from === "DELIVERED" || from === "REJECTED") return base;
  return [...base, "REJECTED"];
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return from !== to && allowedTransitions(from).includes(to);
}

/** The approval needed to move *forward* into `to`, if any. Moving back never needs one. */
export function approvalRequiredFor(from: LeadStatus, to: LeadStatus): ApprovalAction | null {
  const gate = APPROVAL_GATES[to];
  if (!gate) return null;
  const order = ["NEW_LEAD", "ANALYZED", "QUALIFIED", "CONTACTED", "INTERESTED", "PROPOSAL_SENT", "ACCEPTED", "IN_DEVELOPMENT", "REVIEW", "DELIVERED"];
  const fromIdx = order.indexOf(from);
  const toIdx = order.indexOf(to);
  // Coming back from REJECTED (-1) or moving forward both require the gate.
  return fromIdx < toIdx ? gate : null;
}

export const OPEN_STATUSES: LeadStatus[] = ["NEW_LEAD", "ANALYZED", "QUALIFIED", "CONTACTED", "INTERESTED", "PROPOSAL_SENT", "ACCEPTED"];
export const ACTIVE_PROJECT_STATUSES: LeadStatus[] = ["IN_DEVELOPMENT", "REVIEW"];
