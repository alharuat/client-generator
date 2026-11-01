import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLead } from "@/lib/leads/service";
import { allowedTransitions, approvalRequiredFor } from "@/lib/leads/status";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/leads/constants";
import { ACTION_LABEL } from "@/lib/approvals/service";
import { addNoteAction, changeStatusAction, decideApprovalAction, rescoreLeadAction, updateLeadAction } from "@/server/actions";
import { LeadForm } from "@/components/lead-form";
import { Flash, PriorityBadge, ProspectBadge, Score, StatusBadge, formatDate } from "@/components/ui";
import { isAppError } from "@/lib/core/errors";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function LeadPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const lead = await getLead(id).catch((e) => {
    if (isAppError(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  });
  const members = await prisma.teamMember.findMany({ orderBy: { name: "asc" } });
  const analysis = lead.analyses[0];
  const social = Object.entries((lead.socialLinks ?? {}) as Record<string, string>).filter(([, v]) => v);
  const pending = lead.approvals.filter((a) => a.status === "PENDING");
  const next = allowedTransitions(lead.status);

  return (
    <>
      <div className="mb-2 text-sm"><Link href="/crm" className="text-zinc-500 hover:underline">← CRM</Link></div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{CATEGORY_LABEL[lead.category]}</span>
            {lead.city && <span>· {[lead.neighborhood, lead.city, lead.country].filter(Boolean).join(", ")}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            <ProspectBadge type={lead.prospectType} />
            <PriorityBadge priority={lead.priority} />
            <Score value={lead.score} />
          </div>
        </div>
        <form action={rescoreLeadAction.bind(null, lead.id)}>
          <button className="btn-secondary" type="submit">Recompute score</button>
        </form>
      </div>

      <Flash error={sp.error} ok={sp.ok} />

      {pending.map((a) => (
        <div key={a.id} className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-sm text-amber-900">
            <span className="font-medium">Waiting for approval:</span> {ACTION_LABEL[a.action]} · requested by {a.requestedBy} {formatDate(a.createdAt)}
          </div>
          <form action={decideApprovalAction.bind(null, a.id)} className="flex gap-2">
            <input type="hidden" name="returnTo" value={`/crm/${lead.id}`} />
            <button className="btn" name="decision" value="APPROVED">Approve</button>
            <button className="btn-secondary" name="decision" value="REJECTED">Reject</button>
          </form>
        </div>
      ))}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Contact information</h2>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row k="Phone" v={lead.phone ? <a className="hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a> : null} />
              <Row k="Email" v={lead.email ? <a className="hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a> : null} />
              <Row k="Address" v={lead.address} />
              <Row k="Website" v={lead.websiteUrl ? <a className="text-sky-700 hover:underline" href={lead.websiteUrl} target="_blank" rel="noreferrer noopener">{lead.websiteUrl}</a> : "None"} />
              <Row k="Google Maps" v={lead.googleMapsUrl ? <a className="text-sky-700 hover:underline" href={lead.googleMapsUrl} target="_blank" rel="noreferrer noopener">Open</a> : null} />
              <Row k="Rating" v={lead.googleRating ? `${lead.googleRating.toFixed(1)} ★ from ${lead.reviewCount ?? 0} reviews` : null} />
              <Row k="Social" v={social.length ? social.map(([k, v]) => <a key={k} className="mr-2 text-sky-700 hover:underline" href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer noopener">{k}</a>) : null} />
              <Row k="Source" v={lead.source.toLowerCase().replace("_", " ")} />
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Website analysis</h2>
            {analysis ? (
              <div className="space-y-3 text-sm">
                <p>{analysis.businessProfile}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Mini k="Quality" v={analysis.websiteQualityScore} />
                  <Mini k="Mobile" v={analysis.mobileScore} />
                  <Mini k="SEO" v={analysis.seoScore} />
                  <Mini k="Lead score" v={analysis.leadScore} />
                </div>
                {analysis.recommendedWebsiteType && <p><span className="font-medium">Recommended:</span> {analysis.recommendedWebsiteType}</p>}
                {analysis.recommendedFeatures.length > 0 && <ul className="list-disc pl-5">{analysis.recommendedFeatures.map((f) => <li key={f}>{f}</li>)}</ul>}
                {analysis.designDirection && <p><span className="font-medium">Design direction:</span> {analysis.designDirection}</p>}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">
                Not analyzed yet. The Claude lead-analysis agent (Phase 3) will audit the website, score quality, mobile and SEO, and recommend features and a design direction.
                {lead.prospectType === "NO_WEBSITE" && " This business has no website, so it is a Type A prospect."}
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Edit lead</h2>
            <LeadForm action={updateLeadAction.bind(null, lead.id)} lead={lead} members={members} submitLabel="Save changes" />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Move in pipeline</h2>
            {next.length === 0 ? (
              <p className="text-sm text-zinc-500">This lead is in a final state.</p>
            ) : (
              <form action={changeStatusAction.bind(null, lead.id)} className="space-y-3">
                <select className="input" name="status" required>
                  {next.map((s) => {
                    const gate = approvalRequiredFor(lead.status, s);
                    return <option key={s} value={s}>{STATUS_LABEL[s]}{gate ? " (needs approval)" : ""}</option>;
                  })}
                </select>
                <input className="input" name="note" placeholder="Note (optional)" />
                <button className="btn w-full" type="submit">Update status</button>
              </form>
            )}
          </section>

          {lead.project && (
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold">Project</h2>
              <Link href={`/projects/${lead.project.id}`} className="text-sm text-sky-700 hover:underline">{lead.project.name}</Link>
              <div className="mt-1 text-xs text-zinc-500">{lead.project.tasks.filter((t) => t.status === "DONE").length}/{lead.project.tasks.length} tasks done</div>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Activity</h2>
            <form action={addNoteAction.bind(null, lead.id)} className="mb-4 flex gap-2">
              <input className="input" name="note" placeholder="Add a note…" required />
              <button className="btn-secondary" type="submit">Add</button>
            </form>
            <ol className="space-y-3">
              {lead.activities.map((a) => (
                <li key={a.id} className="border-l-2 border-zinc-200 pl-3 text-sm">
                  <div className={a.type === "note" ? "text-zinc-900" : "text-zinc-600"}>{a.message}</div>
                  <div className="text-xs text-zinc-400">{formatDate(a.createdAt)} · {a.actor}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-zinc-500">{k}</dt>
      <dd className="min-w-0 break-words">{v || <span className="text-zinc-400">–</span>}</dd>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: number | null }) {
  return (
    <div className="rounded-md bg-zinc-50 p-2">
      <div className="text-xs text-zinc-500">{k}</div>
      <div className="text-lg font-semibold tabular-nums">{v ?? "–"}</div>
    </div>
  );
}
