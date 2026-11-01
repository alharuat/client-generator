import { processBatch, releaseStaleJobs } from "../src/lib/workflow/jobs";
import { handlers } from "../src/lib/workflow/handlers";
import { createLogger } from "../src/lib/core/logger";
import { prisma } from "../src/lib/db";

const log = createLogger("worker");
const workerId = `worker-${process.pid}`;
let stopping = false;

process.on("SIGINT", () => (stopping = true));
process.on("SIGTERM", () => (stopping = true));

async function main() {
  log.info("worker started", { workerId, types: Object.keys(handlers) });
  let lastSweep = 0;
  while (!stopping) {
    if (Date.now() - lastSweep > 60_000) {
      await releaseStaleJobs();
      lastSweep = Date.now();
    }
    const n = await processBatch(handlers, workerId, 5).catch((e) => {
      log.error("batch failed", { error: String(e) });
      return 0;
    });
    if (n === 0) await new Promise((r) => setTimeout(r, 2_000));
  }
  await prisma.$disconnect();
  log.info("worker stopped");
}

main();
