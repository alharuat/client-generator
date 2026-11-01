import Link from "next/link";
import { prisma } from "@/lib/db";
import { CATEGORY_LABEL } from "@/lib/leads/constants";
import { Empty, PageHeader, formatDate } from "@/components/ui";

const DEPLOY_COLOR: Record<string, string> = {
  NOT_DEPLOYED: "bg-zinc-100 text-zinc-600", BUILDING: "bg-sky-100 text-sky-800", PREVIEW: "bg-amber-100 text-amber-800", PRODUCTION: "bg-emerald-100 text-emerald-800", FAILED: "bg-red-100 text-red-700",
};

export default async function PortfolioPage() {
  const sites = await prisma.website.findMany({ orderBy: { updatedAt: "desc" }, include: { lead: { select: { id: true, name: true, city: true } } } });
  return (
    <>
      <PageHeader title="Website Portfolio" description="Generated websites, previews and deployment status." />
      {sites.length === 0 ? (
        <Empty title="No websites generated yet">The development agent (Phase 5) creates a repository and preview for each approved project; they are listed here with their deployment status.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/crm/${s.lead.id}`} className="truncate text-sm font-semibold hover:underline">{s.lead.name}</Link>
                <span className={`rounded-full px-2 py-0.5 text-xs ${DEPLOY_COLOR[s.deploymentStatus]}`}>{s.deploymentStatus.replace("_", " ").toLowerCase()}</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">{CATEGORY_LABEL[s.industry]}{s.lead.city ? ` · ${s.lead.city}` : ""}</div>
              <div className="mt-3 space-y-1 text-sm">
                {s.previewUrl && <a className="block text-sky-700 hover:underline" href={s.previewUrl} target="_blank" rel="noreferrer noopener">Preview</a>}
                {s.productionUrl && <a className="block text-sky-700 hover:underline" href={s.productionUrl} target="_blank" rel="noreferrer noopener">Live site</a>}
                {s.githubRepo && <a className="block text-sky-700 hover:underline" href={`https://github.com/${s.githubRepo}`} target="_blank" rel="noreferrer noopener">{s.githubRepo}</a>}
              </div>
              <div className="mt-2 text-xs text-zinc-400">Updated {formatDate(s.updatedAt)}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
