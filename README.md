# Client Generator

AI-powered website agency platform: discover local businesses that need a website, score and manage them in a CRM with human approval checkpoints, then (in later phases) create ClickUp projects and have Claude design, build, test and deliver their websites.

**Status: Phase 1 (dashboard and database) is complete.** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and roadmap.

## What works today

- **Overview**: total leads, qualified, websites generated, in development, delivered, conversion rate, pipeline chart, recent activity.
- **Lead Discovery**: add leads with automatic duplicate blocking (Place ID, phone, domain, name + city) and an instant rule-based score; Type A (no website) detection.
- **CRM**: search, filter (status, category, city, website state, owner), sort, paginate; lead detail with contact info, website analysis, editing, assignment, notes and a full activity timeline; pipeline moves across all 11 statuses.
- **Approvals**: qualifying a lead, contacting a business and starting a project wait for a person to approve. Approving "Create client project" creates the project with the 14 standard tasks.
- **ClickUp Projects**: project list with progress; task board with priorities, due dates, assigned agents, dependencies (enforced) and acceptance criteria.
- **AI Agents**: the six agents, their run counts, and the workflow execution history with events.
- **Website Portfolio** and **Settings** (integration status from env vars, live DB check, team members).
- **REST API** under `/api` (see below), Postgres-backed job queue with retries and a worker.

## Quick start

```bash
cp .env.example .env            # set DATABASE_URL / DIRECT_URL
npm install
npx prisma migrate deploy       # or `npm run db:migrate` while developing
npm run db:seed                 # optional demo data (fictional businesses)
npm run dev                     # http://localhost:3000
npm run worker                  # in another terminal, processes background jobs
```

Using Supabase: create a project, then copy the pooled connection string (port 6543, add `?pgbouncer=true`) to `DATABASE_URL` and the direct one (port 5432) to `DIRECT_URL`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run worker` | Long-running job worker |
| `npm run lint` / `typecheck` | ESLint / tsc |
| `npm test` | Unit tests; integration tests too when `TEST_DATABASE_URL` is set |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |

Integration tests run migrations against `TEST_DATABASE_URL` and truncate its tables between tests, so point it at a throwaway database, never at real data.

## Environment variables

All secrets are environment variables; none are stored in the database or shown in the UI. Full list with comments in [.env.example](.env.example).

| Variable | Phase | Required | Purpose |
|---|---|---|---|
| `DATABASE_URL` | 1 | yes | Postgres connection (pooled on Supabase) |
| `DIRECT_URL` | 1 | Supabase | Direct connection for migrations |
| `DASHBOARD_USER` / `DASHBOARD_PASSWORD` | 1 | prod | Dashboard login (HTTP Basic). Production returns 503 without a password. |
| `ADMIN_API_TOKEN` | 1 | for API/cron | Bearer token for `/api/*`. Cannot decide approvals. |
| `LOG_LEVEL`, `PRISMA_LOG_QUERIES`, `APP_URL` | 1 | no | Logging and URLs |
| `TEST_DATABASE_URL` | 1 | tests | Throwaway DB for integration tests |
| `GOOGLE_PLACES_API_KEY` | 2 | | Places API (New) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | 3 | | Claude |
| `CLICKUP_API_TOKEN`, `CLICKUP_SPACE_ID`, `CLICKUP_TEAM_ID` | 4 | | ClickUp |
| `GITHUB_TOKEN`, `GITHUB_OWNER` | 6 | | One repo per client site |
| `VERCEL_TOKEN`, `VERCEL_TEAM_ID` | 6 | | Preview and production deploys |

## API

All routes need `Authorization: Bearer $ADMIN_API_TOKEN` (or a dashboard login), except `/api/health`. Errors are JSON: `{ "error": { "code", "message" } }`. Rate limited per IP.

| Method | Route | |
|---|---|---|
| GET | `/api/health` | DB liveness |
| GET | `/api/leads?q=&status=&category=&city=&prospectType=&noWebsite=true&minScore=&sort=score&page=` | List/filter |
| POST | `/api/leads` | Create (409 `DUPLICATE` if it already exists) |
| GET / PATCH | `/api/leads/:id` | Read / edit |
| POST | `/api/leads/:id/status` | `{ status, note? }`; 202 with `approvalId` when the move needs approval |
| GET | `/api/approvals?status=PENDING` | List |
| POST | `/api/approvals/:id` | `{ decision: "APPROVED" \| "REJECTED", note? }` (dashboard users only) |
| GET | `/api/integrations` | Which integrations are configured (never values) |
| POST | `/api/jobs/run` | Drain due jobs (for cron) |

## Deploying to Vercel

1. Create the Vercel project from this repo and set the env vars above (at least `DATABASE_URL`, `DIRECT_URL`, `DASHBOARD_PASSWORD`, `ADMIN_API_TOKEN`).
2. Build command: `prisma migrate deploy && npm run build`.
3. Add a cron that calls `POST /api/jobs/run` with the bearer token every minute, or run `npm run worker` on a small always-on host.
