import type { Job } from "@prisma/client";
import type { JobHandler } from "./jobs";
import { recordRun } from "./runs";
import { recomputeLeadScore } from "../leads/service";

/**
 * Job handlers. Later phases register discovery, analysis, ClickUp sync,
 * generation, QA and deploy handlers here.
 */
export const handlers: Record<string, JobHandler> = {
  "lead.rescore": async (job: Job) => {
    const { leadId } = job.payload as { leadId: string };
    await recordRun({ kind: "lead.rescore", agent: "QUALIFICATION", leadId, input: { jobId: job.id } }, async ({ event }) => {
      const lead = await recomputeLeadScore(leadId);
      await event("INFO", `Score recomputed: ${lead.score}`);
      return { score: lead.score };
    });
  },
};
