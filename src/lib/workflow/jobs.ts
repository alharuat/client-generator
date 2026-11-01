import type { Job, Prisma } from "@prisma/client";
import { prisma } from "../db";
import { createLogger } from "../core/logger";
import { backoffDelay } from "../core/retry";

const log = createLogger("jobs");

export type JobHandler = (job: Job) => Promise<void>;

export async function enqueue(type: string, payload: Prisma.InputJsonValue = {}, opts: { runAt?: Date; maxAttempts?: number; dedupeKey?: string; runId?: string } = {}) {
  if (opts.dedupeKey) {
    const existing = await prisma.job.findUnique({ where: { dedupeKey: opts.dedupeKey } });
    if (existing && (existing.status === "PENDING" || existing.status === "RUNNING")) return existing;
    if (existing) await prisma.job.update({ where: { id: existing.id }, data: { dedupeKey: null } });
  }
  return prisma.job.create({
    data: { type, payload, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 5, dedupeKey: opts.dedupeKey, runId: opts.runId },
  });
}

/** Atomically claim up to `limit` due jobs. Safe with many concurrent workers. */
export async function claimJobs(workerId: string, limit = 5): Promise<Job[]> {
  return prisma.$queryRaw<Job[]>`
    UPDATE "Job" SET status = 'RUNNING', "lockedAt" = now(), "lockedBy" = ${workerId},
      attempts = attempts + 1, "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "Job"
      WHERE status = 'PENDING' AND "runAt" <= now()
      ORDER BY "runAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *`;
}

export async function completeJob(id: string) {
  await prisma.job.update({ where: { id }, data: { status: "SUCCEEDED", lockedAt: null, lockedBy: null, lastError: null } });
}

export async function failJob(job: Job, error: unknown, now = new Date()) {
  const message = error instanceof Error ? error.message : String(error);
  const dead = job.attempts >= job.maxAttempts;
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: dead ? "DEAD" : "PENDING",
      lastError: message.slice(0, 2000),
      lockedAt: null,
      lockedBy: null,
      runAt: dead ? job.runAt : new Date(now.getTime() + backoffDelay(job.attempts, 2_000, 10 * 60_000)),
    },
  });
  log.warn(dead ? "job dead" : "job will retry", { id: job.id, type: job.type, attempts: job.attempts, error: message });
}

/** Re-queue jobs whose worker died mid-flight. */
export async function releaseStaleJobs(olderThanMs = 15 * 60_000) {
  const cutoff = new Date(Date.now() - olderThanMs);
  const { count } = await prisma.job.updateMany({
    where: { status: "RUNNING", lockedAt: { lt: cutoff } },
    data: { status: "PENDING", lockedAt: null, lockedBy: null },
  });
  return count;
}

export async function processBatch(handlers: Record<string, JobHandler>, workerId: string, limit = 5): Promise<number> {
  const jobs = await claimJobs(workerId, limit);
  for (const job of jobs) {
    const handler = handlers[job.type];
    try {
      if (!handler) throw new Error(`No handler registered for job type "${job.type}"`);
      await handler(job);
      await completeJob(job.id);
    } catch (e) {
      await failJob(job, e);
    }
  }
  return jobs.length;
}
