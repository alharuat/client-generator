import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateTaskStatusAction } from "@/server/actions";
import { Flash, PriorityBadge, formatDate } from "@/components/ui";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> };
const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"] as const;

export default async function ProjectPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await prisma.project.findUnique({ where: { id }, include: { lead: true, tasks: { orderBy: { order: "asc" } } } });
  if (!project) notFound();
  const byKey = new Map(project.tasks.map((t) => [t.key, t]));
  return (
    <>
      <div className="mb-2 text-sm"><Link href="/projects" className="text-zinc-500 hover:underline">← Projects</Link></div>
      <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-500">
        Client: <Link className="text-sky-700 hover:underline" href={`/crm/${project.leadId}`}>{project.lead.name}</Link> · Due {formatDate(project.dueDate)}
        {project.clickupListId && <> · ClickUp list {project.clickupListId}</>}
      </p>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="space-y-3">
        {project.tasks.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-zinc-400">{t.order}.</span>
                  <span className="text-sm font-medium">{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                  {t.assignedAgent && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">{t.assignedAgent.toLowerCase()} agent</span>}
                </div>
                <p className="mt-1 text-sm text-zinc-600">{t.description}</p>
                <ul className="mt-2 list-disc pl-5 text-xs text-zinc-500">{t.acceptanceCriteria.map((c) => <li key={c}>{c}</li>)}</ul>
                <div className="mt-2 text-xs text-zinc-400">
                  Due {formatDate(t.dueDate)}
                  {t.dependsOn.length > 0 && <> · after {t.dependsOn.map((k) => byKey.get(k)?.title ?? k).join(", ")}</>}
                  {t.clickupTaskId && <> · ClickUp {t.clickupTaskId}</>}
                </div>
              </div>
              <form action={updateTaskStatusAction.bind(null, project.id, t.id)} className="flex gap-2">
                <select className="input w-36" name="status" defaultValue={t.status}>
                  {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
                </select>
                <button className="btn-secondary" type="submit">Set</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
