import Link from "next/link";
import { ACTION_LABEL, listApprovals } from "@/lib/approvals/service";
import { decideApprovalAction } from "@/server/actions";
import { Empty, Flash, PageHeader, Score, StatusBadge, formatDate } from "@/components/ui";

type SP = Promise<Record<string, string | undefined>>;
const TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"] as const;

export default async function ApprovalsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof TABS)[number]) : "PENDING";
  const approvals = await listApprovals(tab);
  return (
    <>
      <PageHeader title="Approvals" description="Human checkpoints: qualifying leads, contacting businesses, creating projects, publishing websites and sharing credentials." />
      <Flash error={sp.error} ok={sp.ok} />
      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => (
          <Link key={t} href={`/approvals?status=${t}`} className={`rounded-full px-3 py-1 text-xs ${tab === t ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>
      {approvals.length === 0 ? (
        <Empty title={tab === "PENDING" ? "Nothing waiting for you" : "No approvals here"}>Gated actions on a lead (for example moving it to Qualified) appear here for a decision.</Empty>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium">{ACTION_LABEL[a.action]}</div>
                {a.lead && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/crm/${a.lead.id}`} className="text-sky-700 hover:underline">{a.lead.name}</Link>
                    {a.lead.city && <span className="text-zinc-500">{a.lead.city}</span>}
                    <StatusBadge status={a.lead.status} />
                    <Score value={a.lead.score} />
                  </div>
                )}
                <div className="mt-1 text-xs text-zinc-400">
                  Requested by {a.requestedBy} · {formatDate(a.createdAt)}
                  {a.decidedAt && ` · ${a.status.toLowerCase()} by ${a.decidedBy} ${formatDate(a.decidedAt)}`}
                  {a.decisionNote && ` · ${a.decisionNote}`}
                </div>
              </div>
              {a.status === "PENDING" && (
                <form action={decideApprovalAction.bind(null, a.id)} className="flex flex-wrap gap-2">
                  <input className="input w-48" name="note" placeholder="Note (optional)" />
                  <button className="btn" name="decision" value="APPROVED">Approve</button>
                  <button className="btn-secondary" name="decision" value="REJECTED">Reject</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
