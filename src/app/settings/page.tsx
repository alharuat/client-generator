import { integrationStatuses } from "@/lib/core/env";
import { prisma } from "@/lib/db";
import { addTeamMemberAction } from "@/server/actions";
import { Flash, PageHeader } from "@/components/ui";

type SP = Promise<Record<string, string | undefined>>;

async function dbCheck() {
  const t = Date.now();
  try {
    const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
    return { ok: true, latency: Date.now() - t, version: version.split(" ").slice(0, 2).join(" ") };
  } catch (e) {
    return { ok: false, latency: Date.now() - t, version: e instanceof Error ? e.message.split("\n")[0] : "unreachable" };
  }
}

export default async function SettingsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [db, members] = await Promise.all([dbCheck(), prisma.teamMember.findMany({ orderBy: { name: "asc" } })]);
  const integrations = integrationStatuses();
  return (
    <>
      <PageHeader title="Settings" description="Integrations are configured with environment variables. Secret values are never shown or stored in the database." />
      <Flash error={sp.error} ok={sp.ok} />
      <div className="grid gap-3 md:grid-cols-2">
        {integrations.map((i) => (
          <div key={i.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{i.name}</div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${i.configured ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}>{i.configured ? "Configured" : "Not configured"}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{i.purpose}</p>
            <div className="mt-2 text-xs text-zinc-500">
              Phase {i.phase} · env: {[...i.required, ...i.optional.map((o) => `${o} (optional)`)].join(", ")}
            </div>
            {i.missing.length > 0 && <div className="mt-1 text-xs text-amber-700">Missing: {i.missing.join(", ")}</div>}
            {i.id === "database" && (
              <div className={`mt-2 text-xs ${db.ok ? "text-emerald-700" : "text-red-700"}`}>{db.ok ? `Connected · ${db.version} · ${db.latency} ms` : `Connection failed: ${db.version}`}</div>
            )}
            <a href={i.docsUrl} target="_blank" rel="noreferrer noopener" className="mt-2 inline-block text-xs text-sky-700 hover:underline">Provider docs</a>
          </div>
        ))}
      </div>

      <section className="card mt-6 p-5">
        <h2 className="mb-3 text-sm font-semibold">Team</h2>
        <ul className="mb-4 divide-y divide-zinc-100 text-sm">
          {members.length === 0 && <li className="py-2 text-zinc-500">No team members yet. Add people to assign leads.</li>}
          {members.map((m) => <li key={m.id} className="flex justify-between py-2"><span>{m.name} <span className="text-zinc-400">· {m.email}</span></span><span className="text-zinc-500">{m.role}</span></li>)}
        </ul>
        <form action={addTeamMemberAction} className="grid gap-2 sm:grid-cols-4">
          <input className="input" name="name" placeholder="Name" required />
          <input className="input" name="email" type="email" placeholder="Email" required />
          <input className="input" name="role" placeholder="Role (e.g. sales)" />
          <button className="btn" type="submit">Add member</button>
        </form>
      </section>
    </>
  );
}
