import { execSync } from "node:child_process";

/**
 * Integration tests run against TEST_DATABASE_URL (never DATABASE_URL, so real
 * data is never touched). Migrations are applied; each test truncates tables.
 * Without TEST_DATABASE_URL, integration suites are skipped.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url } });
}
