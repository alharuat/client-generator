import Link from "next/link";
import { listProjects } from "@/lib/projects/service";
import { isConfigured } from "@/lib/core/env";
import { Empty, PageHeader, formatDate } from "@/components/ui";

export default async function ProjectsPage() {
  const projects = await listProjects();
  const clickup = isConfigured("clickup");
  return (
    <>
      <PageHeader title="ClickUp Projects" description="One project per approved client, with the 14 standard delivery tasks." />
      {!clickup && (
        <div className="mb-4 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          Projects and tasks are created locally today. ClickUp sync (list + tasks, IDs stored here) arrives in Phase 4 once CLICKUP_API_TOKEN and CLICKUP_SPACE_ID are set.
        </div>
      )}
      {projects.length === 0 ? (
        <Empty title="No projects yet">A project is created when you approve &ldquo;Create client project&rdquo; for an accepted lead (move it to In Development).</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr><th className="th">Project</th><th className="th">Status</th><th className="th">Progress</th><th className="th">Due</th><th className="th">ClickUp</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="td"><Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link></td>
                  <td className="td text-zinc-600">{p.status.replace("_", " ").toLowerCase()}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-200"><span className="block h-full bg-emerald-500" style={{ width: `${p.progress}%` }} /></span>
                      <span className="text-xs tabular-nums text-zinc-600">{p.doneCount}/{p.taskCount}</span>
                    </div>
                  </td>
                  <td className="td text-zinc-600">{formatDate(p.dueDate)}</td>
                  <td className="td">{p.clickupUrl ? <a className="text-sky-700 hover:underline" href={p.clickupUrl} target="_blank" rel="noreferrer noopener">Open</a> : <span className="text-xs text-zinc-400">Not synced</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
