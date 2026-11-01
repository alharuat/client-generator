import { prisma } from "../db";
import { AppError } from "../core/errors";
import { STANDARD_TASKS, addDays, projectName } from "./templates";

/** Create the local project record and its 14 standard tasks. Idempotent per lead. */
export async function createProjectForLead(leadId: string, start = new Date()) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { project: true } });
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found");
  if (lead.project) return lead.project;
  const last = STANDARD_TASKS[STANDARD_TASKS.length - 1];
  return prisma.project.create({
    data: {
      leadId,
      name: projectName(lead.name),
      status: "PLANNED",
      startDate: start,
      dueDate: addDays(start, last.dueInDays),
      tasks: {
        create: STANDARD_TASKS.map((t, i) => ({
          key: t.key,
          order: i + 1,
          title: t.title,
          description: t.description,
          priority: t.priority,
          assignedAgent: t.agent,
          dueDate: addDays(start, t.dueInDays),
          dependsOn: t.dependsOn,
          acceptanceCriteria: t.acceptanceCriteria,
        })),
      },
    },
  });
}

export async function listProjects() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { lead: true, tasks: { select: { status: true } } },
  });
  return projects.map((p) => {
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    return { ...p, taskCount: p.tasks.length, doneCount: done, progress: p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0 };
  });
}

export async function updateTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE") {
  const task = await prisma.projectTask.findUnique({ where: { id: taskId }, include: { project: { include: { tasks: true } } } });
  if (!task) throw new AppError("NOT_FOUND", "Task not found");
  if (status === "DONE" || status === "IN_PROGRESS") {
    const blockers = task.project.tasks.filter((t) => task.dependsOn.includes(t.key) && t.status !== "DONE");
    if (blockers.length) throw new AppError("CONFLICT", `Waiting on: ${blockers.map((b) => b.title).join(", ")}`);
  }
  const updated = await prisma.projectTask.update({ where: { id: taskId }, data: { status } });
  if (task.project.status === "PLANNED" && status !== "TODO") {
    await prisma.project.update({ where: { id: task.projectId }, data: { status: "IN_PROGRESS" } });
  }
  return updated;
}
