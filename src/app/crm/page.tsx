import Link from "next/link";
import { listLeads } from "@/lib/leads/service";
import { prisma } from "@/lib/db";
import { CATEGORIES, CATEGORY_LABEL, LEAD_STATUSES, PROSPECT_LABEL, PROSPECT_TYPES, STATUS_LABEL } from "@/lib/leads/constants";
import { Empty, PageHeader, PriorityBadge, ProspectBadge, Score, StatusBadge } from "@/components/ui";

type SP = Promise<Record<string, string | undefined>>;

export default async function CrmPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const clean = Object.fromEntries(Object.entries(sp).filter(([, v]) => v));
  const [{ items, total, page, pageSize, filter }, members, cities] = await Promise.all([
    listLeads(clean),
    prisma.teamMember.findMany({ orderBy: { name: "asc" } }),
    prisma.lead.findMany({ where: { city: { not: null } }, distinct: ["city"], select: { city: true }, orderBy: { city: "asc" }, take: 200 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (p: number) => new URLSearchParams({ ...clean, page: String(p) }).toString();

  return (
    <>
      <PageHeader title="CRM" description={`${total} lead${total === 1 ? "" : "s"}`} actions={<Link className="btn" href="/discovery">Add lead</Link>} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/crm" className={`rounded-full px-3 py-1 text-xs ${!filter.status ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"}`}>All</Link>
        {LEAD_STATUSES.map((s) => (
          <Link key={s} href={`/crm?${new URLSearchParams({ ...clean, status: s, page: "1" })}`} className={`rounded-full px-3 py-1 text-xs ${filter.status === s ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"}`}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-7" method="get">
        {filter.status && <input type="hidden" name="status" value={filter.status} />}
        <input className="input lg:col-span-2" name="q" defaultValue={filter.q} placeholder="Search name, phone, email, address…" />
        <select className="input" name="category" defaultValue={filter.category ?? ""}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select className="input" name="city" defaultValue={filter.city ?? ""}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.city} value={c.city!}>{c.city}</option>)}
        </select>
        <select className="input" name="prospectType" defaultValue={filter.prospectType ?? ""}>
          <option value="">All website states</option>
          {PROSPECT_TYPES.map((p) => <option key={p} value={p}>{PROSPECT_LABEL[p]}</option>)}
        </select>
        <select className="input" name="assigneeId" defaultValue={filter.assigneeId ?? ""}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select className="input" name="sort" defaultValue={filter.sort}>
            <option value="score">Top score</option>
            <option value="recent">Newest</option>
            <option value="rating">Best rated</option>
            <option value="name">Name</option>
          </select>
          <button className="btn" type="submit">Filter</button>
        </div>
      </form>

      {items.length === 0 ? (
        <Empty title="No leads match">Try clearing filters, or add a lead from Lead Discovery.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="th">Business</th>
                <th className="th">Location</th>
                <th className="th">Website</th>
                <th className="th">Rating</th>
                <th className="th">Score</th>
                <th className="th">Priority</th>
                <th className="th">Status</th>
                <th className="th">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-50">
                  <td className="td">
                    <Link href={`/crm/${l.id}`} className="font-medium hover:underline">{l.name}</Link>
                    <div className="text-xs text-zinc-500">{CATEGORY_LABEL[l.category]}</div>
                  </td>
                  <td className="td text-zinc-600">{[l.neighborhood, l.city].filter(Boolean).join(", ") || "–"}</td>
                  <td className="td"><ProspectBadge type={l.prospectType} /></td>
                  <td className="td tabular-nums text-zinc-600">{l.googleRating ? `${l.googleRating.toFixed(1)} ★ (${l.reviewCount ?? 0})` : "–"}</td>
                  <td className="td"><Score value={l.score} /></td>
                  <td className="td"><PriorityBadge priority={l.priority} /></td>
                  <td className="td"><StatusBadge status={l.status} /></td>
                  <td className="td text-zinc-600">{l.assignee?.name ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-zinc-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-secondary" href={`/crm?${qs(page - 1)}`}>Previous</Link>}
            {page < pages && <Link className="btn-secondary" href={`/crm?${qs(page + 1)}`}>Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}
