import Link from "next/link";
import { createLeadAction } from "@/server/actions";
import { LeadForm } from "@/components/lead-form";
import { Flash, PageHeader, ProspectBadge, Score } from "@/components/ui";
import { isConfigured } from "@/lib/core/env";
import { prisma } from "@/lib/db";
import { CATEGORY_LABEL } from "@/lib/leads/constants";

type SP = Promise<Record<string, string | undefined>>;

export default async function DiscoveryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const placesReady = isConfigured("google-places");
  const recent = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <>
      <PageHeader title="Lead Discovery" description="Find local businesses that need a website." actions={<Link className="btn-secondary" href="/crm?noWebsite=true">Businesses without a website →</Link>} />
      <Flash error={sp.error} ok={sp.ok} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Add a lead</h2>
          <p className="mb-4 mt-1 text-sm text-zinc-500">
            Duplicates are blocked by Google Place ID, phone, website domain, and name + city. The lead gets a rule-based score immediately; the Claude analysis refines it in Phase 3.
          </p>
          <LeadForm action={createLeadAction} submitLabel="Add lead" />
        </section>
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold">Google Places search</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Search by category and city through the official Places API (New), with field masks to keep cost down. Arrives in Phase 2.
            </p>
            <div className={`mt-3 rounded-md px-3 py-2 text-xs ${placesReady ? "bg-emerald-50 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>
              {placesReady ? "GOOGLE_PLACES_API_KEY is configured." : "Set GOOGLE_PLACES_API_KEY to enable it."}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Recently added</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-zinc-500">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recent.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <Link href={`/crm/${l.id}`} className="block truncate text-sm font-medium hover:underline">{l.name}</Link>
                      <div className="text-xs text-zinc-500">{CATEGORY_LABEL[l.category]}{l.city ? ` · ${l.city}` : ""}</div>
                      <div className="mt-1"><ProspectBadge type={l.prospectType} /></div>
                    </div>
                    <Score value={l.score} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
