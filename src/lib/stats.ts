import type { LeadStatus } from "@prisma/client";
import { prisma } from "./db";
import { LEAD_STATUSES } from "./leads/constants";

const QUALIFIED_OR_LATER: LeadStatus[] = ["QUALIFIED", "CONTACTED", "INTERESTED", "PROPOSAL_SENT", "ACCEPTED", "IN_DEVELOPMENT", "REVIEW", "DELIVERED"];
const WON: LeadStatus[] = ["ACCEPTED", "IN_DEVELOPMENT", "REVIEW", "DELIVERED"];

export async function overviewStats() {
  const [byStatus, totalLeads, websites, pendingApprovals, noWebsite, recentActivity, recentRuns] = await Promise.all([
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.count(),
    prisma.website.count(),
    prisma.approval.count({ where: { status: "PENDING" } }),
    prisma.lead.count({ where: { prospectType: "NO_WEBSITE" } }),
    prisma.leadActivity.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { lead: { select: { id: true, name: true } } } }),
    prisma.workflowRun.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const row of byStatus) counts[row.status] = row._count._all;
  const sum = (ss: LeadStatus[]) => ss.reduce((a, s) => a + counts[s], 0);
  const qualified = sum(QUALIFIED_OR_LATER);
  const won = sum(WON);
  return {
    counts,
    totalLeads,
    qualified,
    websites,
    inDevelopment: counts.IN_DEVELOPMENT + counts.REVIEW,
    delivered: counts.DELIVERED,
    noWebsite,
    pendingApprovals,
    /** Won (accepted or later) out of qualified-or-later leads. */
    conversionRate: qualified ? Math.round((won / qualified) * 1000) / 10 : 0,
    recentActivity,
    recentRuns,
  };
}
