import type { AgentKind } from "@prisma/client";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Empty, PageHeader, formatDate } from "@/components/ui";

const AGENTS: { kind: AgentKind; name: string; role: string; phase: number }[] = [
  { kind: "RESEARCH", name: "Research agent", role: "Discovers businesses and collects public information.", phase: 2 },
  { kind: "QUALIFICATION", name: "Lead qualification agent", role: "Audits websites, scores leads and recommends a website type.", phase: 3 },
  { kind: "DESIGN", name: "Design agent", role: "Creates a unique visual direction, sitemap and UI per business.", phase: 5 },
  { kind: "DEVELOPMENT", name: "Development agent", role: "Builds the Next.js site in its own repo and opens previews.", phase: 5 },
  { kind: "QA", name: "QA agent", role: "Runs browser, SEO, accessibility and performance checks.", phase: 7 },
  { kind: "DELIVERY", name: "Delivery agent", role: "Prepares the delivery package after approval.", phase: 7 },
];

const RUN_COLOR: Record<string, string> = {
  SUCCEEDED: "text-emerald-700", FAILED: "text-red-700", RUNNING: "text-sky-700", QUEUED: "text-zinc-500", WAITING_APPROVAL: "text-amber-700", CANCELLED: "text-zinc-400",
};

export default async function AgentsPage() {
  const [grouped, runs, jobs] = await Promise.all([
    prisma.workflowRun.groupBy({ by: ["agent", "status"], _count: { _all: true } }),
    prisma.workflowRun.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { lead: { select: { id: true, name: true } }, events: { orderBy: { createdAt: "asc" }, take: 20 } } }),
    prisma.job.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (k: AgentKind, s?: string) => grouped.filter((g) => g.agent === k && (!s || g.status === s)).reduce((a, g) => a + g._count._all, 0);
  return (
    <>
      <PageHeader title="AI Agents" description="Each agent's runs are recorded with their events, so every automated step is auditable." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <div key={a.kind} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{a.name}</div>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">Phase {a.phase}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{a.role}</p>
            <div className="mt-3 flex gap-4 text-xs text-zinc-600">
              <span>{count(a.kind)} runs</span>
              <span className="text-emerald-700">{count(a.kind, "SUCCEEDED")} ok</span>
              <span className="text-red-700">{count(a.kind, "FAILED")} failed</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">Job queue:</span>
        {jobs.length === 0 ? <span>empty</span> : jobs.map((j) => <span key={j.status}>{j.status.toLowerCase()} {j._count._all}</span>)}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Workflow execution history</h2>
      {runs.length === 0 ? (
        <Empty title="No runs yet">Runs appear here as soon as an agent or job does something, for example &ldquo;Recompute score&rdquo; on a lead.</Empty>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => (
            <details key={r.id} className="card p-3">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                <span className="font-mono text-xs">{r.kind}</span>
                <span className={`text-xs font-medium ${RUN_COLOR[r.status]}`}>{r.status.toLowerCase().replace("_", " ")}</span>
                {r.lead && <Link className="text-sky-700 hover:underline" href={`/crm/${r.lead.id}`}>{r.lead.name}</Link>}
                <span className="ml-auto text-xs text-zinc-400">{formatDate(r.createdAt)}</span>
              </summary>
              <div className="mt-2 space-y-1 border-t border-zinc-100 pt-2 text-xs">
                {r.error && <div className="text-red-700">{r.error}</div>}
                {r.events.map((e) => <div key={e.id} className="text-zinc-600"><span className="text-zinc-400">{e.level}</span> {e.message}</div>)}
                {r.output !== null && <pre className="overflow-x-auto rounded bg-zinc-50 p-2">{JSON.stringify(r.output, null, 2)}</pre>}
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
