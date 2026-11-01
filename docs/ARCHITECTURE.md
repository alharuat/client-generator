# Architecture

Client Generator is a semi-automated web agency: it finds local businesses that need a website, scores them, manages them through a CRM, and (in later phases) has Claude design, build, test and deliver their sites. People stay in control at every step that touches a client or the public.

```
Google Places API ─► Research agent ─► Lead Intelligence (Claude) ─► CRM + approvals ─► ClickUp project
                                                                                            │
                Client delivery ◄─ QA agent ◄─ GitHub + Vercel preview ◄─ Claude design + development
```

## Components

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js 15 (App Router) + TypeScript + Tailwind v4 | Server components read the DB directly; mutations go through server actions and REST routes that share one service layer. |
| Database | PostgreSQL via Prisma (Supabase-compatible) | `DATABASE_URL` (pooled) + `DIRECT_URL` (migrations). |
| Background work | Postgres job queue (`Job` table, `FOR UPDATE SKIP LOCKED`) | `npm run worker` for a long-lived worker, or `POST /api/jobs/run` from a cron. Retries with exponential backoff, dead-lettering, stale-lock recovery, idempotency keys. No Redis needed. |
| Audit trail | `WorkflowRun` + `WorkflowEvent`, `LeadActivity` | Every automated step and every human decision is recorded. |
| Human checkpoints | `Approval` table + `decideApproval()` | Only a signed-in person can decide; API tokens cannot. |
| Auth | HTTP Basic for the dashboard, Bearer token for API/cron | Production refuses to serve until `DASHBOARD_PASSWORD` is set. Swap for Supabase Auth when there is more than one operator. |

## Code layout

```
prisma/schema.prisma        data model and enums
prisma/migrations/          SQL migrations
src/lib/core/               env + integration status, logger (with secret redaction), retry, rate limiting, errors
src/lib/leads/              constants, pipeline state machine, dedupe, scoring, validation, service
src/lib/approvals/          approval requests and decisions (applies the gated action)
src/lib/projects/           the 14 standard tasks and project creation
src/lib/workflow/           workflow runs/events, job queue, job handlers
src/server/                 server actions, API helpers, actor resolution
src/app/                    dashboard pages and /api routes
scripts/worker.ts           long-running job worker
tests/unit, tests/integration
```

## Data model

- **Lead**: business identity, contact info, Google data, `prospectType` (A no website, B poor website, C opportunity), `status`, `score`, `priority`, assignee. Identity columns (`dedupeKey`, `phoneNormalized`, `websiteDomain`, `googlePlaceId`) back duplicate detection.
- **LeadAnalysis**: versioned Claude analysis (profile, quality/mobile/SEO scores, recommended type, features, design direction, lead score). Filled in Phase 3.
- **LeadActivity**: timeline of edits, status moves, notes and approval events.
- **Approval**: `QUALIFY_LEAD`, `CONTACT_BUSINESS`, `CREATE_PROJECT`, `PUBLISH_WEBSITE`, `SHARE_CREDENTIALS`.
- **Project / ProjectTask**: one project per client, 14 template tasks with description, priority, status, due date, assigned agent, dependencies, acceptance criteria, and ClickUp IDs.
- **Website**: repo, preview and production URLs, Vercel project, deployment status, QA report.
- **WorkflowRun / WorkflowEvent / Job**: execution history and queue.

## Pipeline and approval gates

```
New Lead → Analyzed → Qualified* → Contacted* → Interested → Proposal Sent → Accepted → In Development* → Review → Delivered
          (any open state) → Rejected → New Lead
* = needs a human approval
```

Requesting a gated move creates (or reuses) a pending approval and leaves the lead where it is. Approving it applies the move; approving `CREATE_PROJECT` also creates the project and its 14 tasks. Publishing and credential sharing are checked with `hasApproval()` by the deployment and delivery code (Phases 6 to 8).

## Duplicate detection

A new or edited lead is refused when any of these match an existing lead: Google Place ID, last 9 digits of the phone number (so `+212 6…` and `06…` match), website domain (social and Maps links are ignored), or the same name in the same city.

## Scoring (Phase 1, rule-based)

0 to 100: website gap 45 (A 45, B 35, C 20, unknown 10), Google rating up to 15, review volume up to 15, phone 10 and email 5, social presence up to 10. Priority: ≥80 urgent, ≥60 high, ≥40 medium. Claude's `leadScore` replaces it once an analysis exists.

## Integrations and compliance

| Integration | Phase | How |
|---|---|---|
| Google Places API (New) | 2 | Official Text Search / Place Details with field masks. No scraping of Google Maps pages. Respect Places caching terms: keep `place_id` indefinitely, refresh other Places content rather than storing it long-term. |
| Claude API | 3, 5 | Structured outputs for lead analysis; Claude as design and development agent for generated sites. |
| ClickUp API | 4 | Create a List per project in `CLICKUP_SPACE_ID`, then the 14 tasks with dependencies; store IDs on `Project` and `ProjectTask`. Rate-limited (100 req/min). |
| GitHub API | 6 | One private repo per client under `GITHUB_OWNER`. |
| Vercel API | 6 | Preview deploy per build; production only after `PUBLISH_WEBSITE` approval. |
| Email discovery | 2 | Only emails the business publishes itself (Places, its own website). Outreach happens only after `CONTACT_BUSINESS` approval and must follow local anti-spam law. |

## Roadmap

1. **Dashboard and database** (this phase).
2. Business discovery via Places, bulk import, search jobs with dedupe.
3. Claude lead analysis: website audit (Lighthouse/Playwright), scores, recommendations.
4. ClickUp sync for approved projects.
5. Claude design + development agents with industry templates.
6. GitHub repo + Vercel preview per site.
7. Automated QA report and delivery package.
8. End-to-end orchestration across all steps.
