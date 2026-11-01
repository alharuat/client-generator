import { z } from "zod";

/**
 * All secrets live in environment variables. This module only reports whether
 * each integration is configured; it never returns secret values to the UI.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  APP_URL: z.string().url().optional(),
  ADMIN_API_TOKEN: z.string().min(16).optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  CLICKUP_API_TOKEN: z.string().optional(),
  CLICKUP_TEAM_ID: z.string().optional(),
  CLICKUP_SPACE_ID: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM_ID: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  return schema.parse(cleaned);
}

export interface IntegrationStatus {
  id: string;
  name: string;
  phase: number;
  purpose: string;
  required: string[];
  optional: string[];
  missing: string[];
  configured: boolean;
  docsUrl: string;
}

const INTEGRATIONS: Omit<IntegrationStatus, "missing" | "configured">[] = [
  {
    id: "database",
    name: "PostgreSQL / Supabase",
    phase: 1,
    purpose: "Leads, CRM pipeline, approvals, projects, workflow history and job queue.",
    required: ["DATABASE_URL"],
    optional: ["DIRECT_URL"],
    docsUrl: "https://supabase.com/docs/guides/database/prisma",
  },
  {
    id: "google-places",
    name: "Google Places API (New)",
    phase: 2,
    purpose: "Discover businesses by category and city through the official Places API.",
    required: ["GOOGLE_PLACES_API_KEY"],
    optional: [],
    docsUrl: "https://developers.google.com/maps/documentation/places/web-service/text-search",
  },
  {
    id: "anthropic",
    name: "Claude API",
    phase: 3,
    purpose: "Lead analysis and scoring, design and development agents.",
    required: ["ANTHROPIC_API_KEY"],
    optional: ["ANTHROPIC_MODEL"],
    docsUrl: "https://docs.claude.com/en/api/overview",
  },
  {
    id: "clickup",
    name: "ClickUp API",
    phase: 4,
    purpose: "Create a project list and the 14 standard tasks for approved clients.",
    required: ["CLICKUP_API_TOKEN", "CLICKUP_SPACE_ID"],
    optional: ["CLICKUP_TEAM_ID"],
    docsUrl: "https://developer.clickup.com/reference",
  },
  {
    id: "github",
    name: "GitHub",
    phase: 6,
    purpose: "One isolated repository per client website.",
    required: ["GITHUB_TOKEN", "GITHUB_OWNER"],
    optional: [],
    docsUrl: "https://docs.github.com/en/rest/repos/repos",
  },
  {
    id: "vercel",
    name: "Vercel",
    phase: 6,
    purpose: "Preview deployments and approved production deploys.",
    required: ["VERCEL_TOKEN"],
    optional: ["VERCEL_TEAM_ID"],
    docsUrl: "https://vercel.com/docs/rest-api",
  },
];

export function integrationStatuses(source: Record<string, string | undefined> = process.env): IntegrationStatus[] {
  return INTEGRATIONS.map((i) => {
    const missing = i.required.filter((k) => !source[k]);
    return { ...i, missing, configured: missing.length === 0 };
  });
}

export function isConfigured(id: string, source: Record<string, string | undefined> = process.env): boolean {
  return integrationStatuses(source).find((i) => i.id === id)?.configured ?? false;
}
