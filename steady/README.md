# Steady

Weekly wellbeing check-ins for employees, and a team health dashboard for managers and HR.
Built from `Steady_Build_Spec.md`; the single-file prototype is the visual and behavioral reference.

**Status:** Phase 1 (Foundation) — scaffold, design tokens, database schema, seed data and app shell.
Auth is stubbed: until Phase 3 every request runs as the seeded HR admin (`lib/viewer.ts`).

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 + shadcn/ui · Recharts · Postgres (Neon) ·
Drizzle ORM + drizzle-kit · Auth.js v5 · Resend · Vercel Cron · Zod · Vitest + Playwright.

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
`NODE_ENV` or `VERCEL_ENV` is `production`.**

| Script | Does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` / `pnpm typecheck` | ESLint / `tsc --noEmit` |
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

## Deploying to Vercel

1. Import the GitHub repo in Vercel and set **Root Directory** to `steady` (the repo root holds an unrelated project).
2. Add the **Neon** integration from the Vercel Marketplace. It injects `DATABASE_URL` / `DATABASE_URL_UNPOOLED`;
   enable "create a database branch for each preview deployment".
3. Add the remaining env vars above as each phase needs them.
4. Vercel runs `pnpm vercel-build` (`scripts/vercel-build.mjs`): it runs `drizzle-kit migrate` when
   `VERCEL_ENV=production`, then `next build`.
5. To get sample data on a preview, run `pnpm db:seed` locally against that preview's Neon branch URL.

## Layout

```
app/
  (auth)/sign-in/        Sign-in (placeholder until phase 3)
  (app)/layout.tsx       App shell: sidebar, top bar, week pill
  (app)/dashboard/       Health Dashboard
  (app)/check-in/        Weekly Check-in
  (app)/feed/            Check-in Feed
  (app)/admin/people/    Roster + CSV import (HR admin)
lib/
  db/schema.ts           Drizzle schema
  scoring.ts             Index math (pure)
  week.ts                Week helpers in the org time zone
  viewer.ts              Signed-in person (stubbed until phase 3)
  queries.ts             Server-side reads
components/
  ui/                    shadcn/ui components
  shell/                 App shell
scripts/
  seed.ts, sample-data.ts
drizzle/                 Migrations
```
