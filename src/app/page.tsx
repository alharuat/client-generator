import Link from "next/link";
import { overviewStats } from "@/lib/stats";
import { LEAD_STATUSES, STATUS_LABEL } from "@/lib/leads/constants";
import { PageHeader, Stat, formatDate } from "@/components/ui";

export default async function OverviewPage() {
  const s = await overviewStats();
  const max = Math.max(1, ...Object.values(s.counts));
  return (
    <>
      <PageHeader title="Overview" description="Pipeline health from discovery to delivery." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Total leads" value={s.totalLeads} hint={`${s.noWebsite} without a website`} />
        <Stat label="Qualified leads" value={s.qualified} hint="Qualified or further" />
        <Stat label="Websites generated" value={s.websites} />
        <Stat label="In development" value={s.inDevelopment} hint="Development + review" />
        <Stat label="Delivered" value={s.delivered} />
        <Stat label="Conversion rate" value={`${s.conversionRate}%`} hint="Accepted ÷ qualified" />
      </div>

      {s.pendingApprovals > 0 && (
        <Link href="/approvals" className="mt-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100">
          <span>{s.pendingApprovals} action{s.pendingApprovals > 1 ? "s" : ""} waiting for your approval</span>
          <span className="font-medium">Review →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Pipeline</h2>
          <div className="space-y-2">
            {LEAD_STATUSES.map((st) => (
              <Link key={st} href={`/crm?status=${st}`} className="group flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs text-zinc-600 group-hover:text-zinc-900">{STATUS_LABEL[st]}</span>
                <span className="h-5 flex-1 rounded bg-zinc-100">
                  <span className="block h-full rounded bg-zinc-800 group-hover:bg-zinc-600" style={{ width: `${(s.counts[st] / max) * 100}%`, minWidth: s.counts[st] ? 4 : 0 }} />
                </span>
                <span className="w-10 text-right text-xs tabular-nums">{s.counts[st]}</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
          {s.recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity yet. Add a lead from Lead Discovery.</p>
          ) : (
            <ul className="space-y-3">
              {s.recentActivity.map((a) => (
                <li key={a.id} className="text-sm">
                  <Link href={`/crm/${a.lead.id}`} className="font-medium hover:underline">{a.lead.name}</Link>
                  <div className="text-zinc-600">{a.message}</div>
                  <div className="text-xs text-zinc-400">{formatDate(a.createdAt)} · {a.actor}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
