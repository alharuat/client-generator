import { beforeEach } from "vitest";

export const hasDb = Boolean(process.env.TEST_DATABASE_URL);
if (hasDb) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
}

export function resetDbEachTest() {
  beforeEach(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$executeRawUnsafe(
      `TRUNCATE "Job","WorkflowEvent","WorkflowRun","Approval","ProjectTask","Website","Project","LeadActivity","LeadAnalysis","Lead","TeamMember" RESTART IDENTITY CASCADE`,
    );
  });
}
