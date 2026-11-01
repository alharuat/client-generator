import { describe, expect, it } from "vitest";
import { hasDb, resetDbEachTest } from "./helpers";

describe.skipIf(!hasDb)("lead pipeline (Postgres)", async () => {
  resetDbEachTest();
  const { prisma } = await import("@/lib/db");
  const leads = await import("@/lib/leads/service");
  const approvals = await import("@/lib/approvals/service");
  const projects = await import("@/lib/projects/service");

  const base = { name: "Trattoria Roma", category: "RESTAURANT", city: "Casablanca", phone: "+212 6 12 34 56 78", googleRating: 4.5, reviewCount: 210 };

  it("creates a scored Type A lead with an activity entry", async () => {
    const lead = await leads.createLead(base, "samir");
    expect(lead.prospectType).toBe("NO_WEBSITE");
    expect(lead.score).toBe(45 + 15 + 15 + 10);
    expect(lead.priority).toBe("URGENT");
    expect(lead.dedupeKey).toBe("ph:612345678");
    const acts = await prisma.leadActivity.findMany({ where: { leadId: lead.id } });
    expect(acts.map((a) => a.type)).toEqual(["created"]);
  });

  it("blocks duplicates by phone, domain and name+city", async () => {
    await leads.createLead({ ...base, websiteUrl: "https://roma.ma" });
    await expect(leads.createLead({ name: "Roma (2)", phone: "0612345678" })).rejects.toMatchObject({ code: "DUPLICATE" });
    await expect(leads.createLead({ name: "Other", websiteUrl: "www.roma.ma/menu" })).rejects.toMatchObject({ code: "DUPLICATE" });
    await expect(leads.createLead({ name: "trattoria roma", city: "Casablanca" })).rejects.toMatchObject({ code: "DUPLICATE" });
    await expect(leads.createLead({ name: "Trattoria Roma", city: "Rabat" })).resolves.toBeTruthy();
  });

  it("gates qualification behind a human approval", async () => {
    const lead = await leads.createLead(base);
    const res = await leads.changeLeadStatus(lead.id, "QUALIFIED", { actor: "samir" });
    expect(res.pendingApproval).toBe(true);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("NEW_LEAD");

    // asking twice does not create a second request
    const again = await leads.changeLeadStatus(lead.id, "QUALIFIED", { actor: "samir" });
    expect(again.approvalId).toBe(res.approvalId);

    await expect(approvals.decideApproval(res.approvalId!, "APPROVED", "system")).rejects.toMatchObject({ code: "VALIDATION" });
    await approvals.decideApproval(res.approvalId!, "APPROVED", "samir", "looks good");
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("QUALIFIED");
    await expect(approvals.decideApproval(res.approvalId!, "APPROVED", "samir")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejected approvals leave the lead where it was", async () => {
    const lead = await leads.createLead(base);
    const res = await leads.changeLeadStatus(lead.id, "QUALIFIED");
    await approvals.decideApproval(res.approvalId!, "REJECTED", "samir");
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("NEW_LEAD");
  });

  it("refuses invalid transitions", async () => {
    const lead = await leads.createLead(base);
    await expect(leads.changeLeadStatus(lead.id, "DELIVERED")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("creates the project with 14 tasks when CREATE_PROJECT is approved", async () => {
    const lead = await leads.createLead(base);
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "ACCEPTED" } });
    const res = await leads.changeLeadStatus(lead.id, "IN_DEVELOPMENT", { actor: "samir" });
    expect(res.pendingApproval).toBe(true);
    await approvals.decideApproval(res.approvalId!, "APPROVED", "samir");

    const project = await prisma.project.findUniqueOrThrow({ where: { leadId: lead.id }, include: { tasks: { orderBy: { order: "asc" } } } });
    expect(project.name).toBe("Trattoria Roma - Website Development");
    expect(project.tasks).toHaveLength(14);
    expect(project.tasks[0].key).toBe("business-research");
    expect(project.tasks[13].dependsOn).toEqual(["deployment"]);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).status).toBe("IN_DEVELOPMENT");

    // dependencies are enforced
    await expect(projects.updateTaskStatus(project.tasks[1].id, "DONE")).rejects.toMatchObject({ code: "CONFLICT" });
    await projects.updateTaskStatus(project.tasks[0].id, "DONE");
    await projects.updateTaskStatus(project.tasks[1].id, "IN_PROGRESS");
    expect((await prisma.project.findUniqueOrThrow({ where: { id: project.id } })).status).toBe("IN_PROGRESS");
  });

  it("filters and searches leads", async () => {
    await leads.createLead(base);
    await leads.createLead({ name: "Pharmacie Atlas", category: "PHARMACY", city: "Rabat", websiteUrl: "https://atlas.ma" });
    expect((await leads.listLeads({ noWebsite: "true" })).items.map((l) => l.name)).toEqual(["Trattoria Roma"]);
    expect((await leads.listLeads({ q: "atlas" })).total).toBe(1);
    expect((await leads.listLeads({ category: "PHARMACY", city: "rabat" })).total).toBe(1);
    expect((await leads.listLeads({ sort: "score" })).items[0].name).toBe("Trattoria Roma");
  });

  it("records edits and blocks edits that would create duplicates", async () => {
    const a = await leads.createLead(base);
    const b = await leads.createLead({ name: "Boulangerie Soleil", category: "BAKERY", city: "Fes", phone: "0522000000" });
    await expect(leads.updateLead(b.id, { phone: "0612345678" })).rejects.toMatchObject({ code: "DUPLICATE" });
    const member = await prisma.teamMember.create({ data: { name: "Samir", email: "s@example.com" } });
    await leads.updateLead(a.id, { assigneeId: member.id }, "samir");
    const acts = await prisma.leadActivity.findMany({ where: { leadId: a.id }, orderBy: { createdAt: "asc" } });
    expect(acts.at(-1)?.type).toBe("assigned");
  });
});
