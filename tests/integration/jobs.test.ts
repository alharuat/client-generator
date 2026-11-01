import { describe, expect, it } from "vitest";
import { hasDb, resetDbEachTest } from "./helpers";

describe.skipIf(!hasDb)("job queue and workflow history (Postgres)", async () => {
  resetDbEachTest();
  const { prisma } = await import("@/lib/db");
  const jobs = await import("@/lib/workflow/jobs");
  const { handlers } = await import("@/lib/workflow/handlers");
  const { createLead } = await import("@/lib/leads/service");

  it("deduplicates active jobs by key", async () => {
    const a = await jobs.enqueue("x", {}, { dedupeKey: "k1" });
    const b = await jobs.enqueue("x", {}, { dedupeKey: "k1" });
    expect(b.id).toBe(a.id);
  });

  it("claims each job once across concurrent workers", async () => {
    for (let i = 0; i < 10; i++) await jobs.enqueue("noop", { i });
    const [w1, w2] = await Promise.all([jobs.claimJobs("w1", 10), jobs.claimJobs("w2", 10)]);
    const ids = [...w1, ...w2].map((j) => j.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it("retries failures with backoff and marks them dead after maxAttempts", async () => {
    await jobs.enqueue("boom", {}, { maxAttempts: 2 });
    const failing = { boom: async () => { throw new Error("upstream down"); } };
    await jobs.processBatch(failing, "w");
    let job = await prisma.job.findFirstOrThrow();
    expect(job.status).toBe("PENDING");
    expect(job.runAt.getTime()).toBeGreaterThan(Date.now());
    await prisma.job.update({ where: { id: job.id }, data: { runAt: new Date(0) } });
    await jobs.processBatch(failing, "w");
    job = await prisma.job.findFirstOrThrow();
    expect(job.status).toBe("DEAD");
    expect(job.lastError).toBe("upstream down");
  });

  it("runs lead.rescore and records the run with events", async () => {
    const lead = await createLead({ name: "Salon Yasmine", category: "BEAUTY_SALON", city: "Tangier", googleRating: 4.8, reviewCount: 90 });
    await prisma.lead.update({ where: { id: lead.id }, data: { score: 0 } });
    await jobs.enqueue("lead.rescore", { leadId: lead.id });
    expect(await jobs.processBatch(handlers, "w")).toBe(1);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).score).toBe(lead.score);
    const run = await prisma.workflowRun.findFirstOrThrow({ include: { events: true } });
    expect(run.status).toBe("SUCCEEDED");
    expect(run.agent).toBe("QUALIFICATION");
    expect(run.events[0].message).toContain("Score recomputed");
    expect((await prisma.job.findFirstOrThrow()).status).toBe("SUCCEEDED");
  });
});
