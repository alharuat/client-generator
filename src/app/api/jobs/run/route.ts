import { processBatch, releaseStaleJobs } from "@/lib/workflow/jobs";
import { handlers } from "@/lib/workflow/handlers";
import { handle } from "@/server/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Drain due jobs. Call from a cron (e.g. Vercel Cron) or run `npm run worker` for a long-lived worker. */
export const POST = handle(async () => {
  const released = await releaseStaleJobs();
  const processed = await processBatch(handlers, `http-${process.pid}`, 10);
  return { released, processed };
});
