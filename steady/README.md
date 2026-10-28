# Steady

Weekly wellbeing check-ins for employees, and a team health dashboard for managers and HR.
Built from `Steady_Build_Spec.md`; the single-file prototype is the visual and behavioral reference.

**Status:** Phases 1–2 — foundation, scoring, and the Weekly Check-in page.
Auth is stubbed: until Phase 3 every request runs as the seeded HR admin (`lib/viewer.ts`).

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 + shadcn/ui · Recharts · Postgres (Neon) ·
Drizzle ORM + drizzle-kit · Auth.js v5 · Resend · Netlify Scheduled Functions · Zod · Vitest + Playwright.

## Local setup

Requires Node 22+, pnpm 10, and a Postgres 16 database.

```bash
cd steady
pnpm install
cp .env.example .env          # used by drizzle-kit and the seed script
cp .env.example .env.local    # used by Next.js
# point DATABASE_URL at your database, e.g. postgres://postgres:postgres@localhost:5432/steady

pnpm db:migrate               # apply migrations in /drizzle
pnpm db:seed                  # 42 sample people, 13 teams, 8 weeks of check-ins
pnpm dev                      # http://localhost:3000
```

The seed is the prototype's sample org, generated with the same seeded RNG, so the dashboard numbers match the
prototype. Its last week is anchored to the current week. **It deletes all org data first and refuses to run when
`NODE_ENV` is `production` or Netlify's `CONTEXT` is `production`.**

| Script | Does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
| `pnpm test` | Vitest unit tests (scoring, weeks, check-in validation) |
| `pnpm db:generate` | Generate a migration from `lib/db/schema.ts` into `/drizzle` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Replace all data with the sample org (local and preview only) |

## Environment variables

| Name | Used for | Phase |
| --- | --- | --- |
| `DATABASE_URL` | Pooled Postgres URL for the app (injected by the Neon integration) | 1 |
| `DATABASE_URL_UNPOOLED` | Direct URL for `drizzle-kit migrate` (falls back to `DATABASE_URL`) | 1 |
| `AUTH_SECRET` | Auth.js session encryption | 3 |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google sign-in | 3 |
| `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Microsoft sign-in | 3 |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated sign-in allowlist; the seed uses the first one for sample emails | 3 |
| `RESEND_API_KEY`, `EMAIL_FROM` | Reminder and digest emails | 5 |
| `CRON_SECRET` | Protects `/api/cron/*` | 5 |

## Deploying to Netlify

1. In Netlify: **Add new project → Import an existing project → GitHub**, and pick this repo. Netlify reads
   `netlify.toml` and builds Next.js with its OpenNext adapter; no other build settings are needed.
2. Add a database: **Extensions → Netlify DB** (Neon Postgres). It injects `NETLIFY_DATABASE_URL` (pooled) and
   `NETLIFY_DATABASE_URL_UNPOOLED` (direct), which the app and drizzle-kit pick up automatically. Any external
   Postgres works too: set `DATABASE_URL` instead.
3. Add the remaining env vars above under **Project configuration → Environment variables** as each phase needs them.
4. The build runs `scripts/netlify-build.mjs`: `drizzle-kit migrate` on production deploys (`CONTEXT=production`),
   then `next build`. Deploy previews skip migrations.
5. To load sample data, run `pnpm db:seed` locally with `DATABASE_URL` pointing at a non-production database.
6. Phase 5's weekly reminder and digest jobs will run as Netlify Scheduled Functions.

## Layout

```
app/
  (auth)/sign-in/        Sign-in (placeholder until phase 3)
  (app)/layout.tsx       App shell: sidebar, top bar, week pill
  (app)/dashboard/       Health Dashboard
  (app)/check-in/        Weekly Check-in + submitCheckin server action
  (app)/feed/            Check-in Feed
  (app)/admin/people/    Roster + CSV import (HR admin)
lib/
  db/schema.ts           Drizzle schema
  scoring.ts             Index math (pure)
  checkin.ts             Questions + Zod schema shared by form and server action
  week.ts                Week helpers in the org time zone
  viewer.ts              Signed-in person (stubbed until phase 3)
  queries.ts             Server-side reads
components/
  ui/                    shadcn/ui components
  shell/                 App shell
  checkin/               Check-in form and 1–5 scale
  shared/                Trend chart, index colors
scripts/
  seed.ts, sample-data.ts, netlify-build.mjs
tests/                   Vitest
drizzle/                 Migrations
```
