import type { AgentKind, LogLevel, Prisma, RunStatus } from "@prisma/client";
import { prisma } from "../db";
import { createLogger } from "../core/logger";

const log = createLogger("workflow");

export interface StartRunInput {
  kind: string;
  agent?: AgentKind;
  leadId?: string;
  projectId?: string;
  input?: Prisma.InputJsonValue;
}

export async function startRun(i: StartRunInput) {
  const run = await prisma.workflowRun.create({
    data: {
      kind: i.kind,
      agent: i.agent,
      leadId: i.leadId,
      projectId: i.projectId,
      input: i.input ?? {},
      status: "RUNNING",
      startedAt: new Date(),
      attempts: 1,
    },
  });
  log.info("run started", { runId: run.id, kind: i.kind });
  return run;
}

export async function logEvent(runId: string, level: LogLevel, message: string, data: Prisma.InputJsonValue = {}) {
  return prisma.workflowEvent.create({ data: { runId, level, message, data } });
}

export async function finishRun(runId: string, status: Extract<RunStatus, "SUCCEEDED" | "FAILED" | "CANCELLED" | "WAITING_APPROVAL">, result?: { output?: Prisma.InputJsonValue; error?: string }) {
  const run = await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status,
      output: result?.output,
      error: result?.error,
      finishedAt: status === "WAITING_APPROVAL" ? null : new Date(),
    },
  });
  log.info("run finished", { runId, status });
  return run;
}

/**
 * Execute `fn` inside a recorded workflow run. Every run, success or failure,
 * lands in the execution history with its events.
 */
export async function recordRun<T extends Prisma.InputJsonValue | void>(
  i: StartRunInput,
  fn: (ctx: { runId: string; event: (level: LogLevel, msg: string, data?: Prisma.InputJsonValue) => Promise<unknown> }) => Promise<T>,
): Promise<T> {
  const run = await startRun(i);
  const event = (level: LogLevel, msg: string, data?: Prisma.InputJsonValue) => logEvent(run.id, level, msg, data);
  try {
    const out = await fn({ runId: run.id, event });
    await finishRun(run.id, "SUCCEEDED", { output: (out ?? undefined) as Prisma.InputJsonValue | undefined });
    return out;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await event("ERROR", message).catch(() => undefined);
    await finishRun(run.id, "FAILED", { error: message });
    throw e;
  }
}
