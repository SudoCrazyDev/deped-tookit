# DepEd ToolKit

Class records and DepEd-compliant grading for Philippine public school teachers.

A pnpm workspace with three apps, all deployed to Cloudflare.

| Folder | What it is | Stack | Local port |
| --- | --- | --- | --- |
| [apps/website](apps/website) | Marketing + introduction site | React 19 + Vite, Workers Static Assets | 5173 |
| [apps/app](apps/app) | The teacher-facing app | React 19 + Vite + TanStack Query, Workers Static Assets | 5174 |
| [apps/api](apps/api) | Backend | Hono on Workers + D1 | 8787 |

## Getting started

```bash
pnpm install

# One-time backend setup — see apps/api/README.md for detail
cd apps/api
pnpm wrangler d1 create depedtoolkit     # paste the id into wrangler.jsonc
pnpm db:migrate:local
cp .dev.vars.example .dev.vars
cd ../..

pnpm dev        # runs all three
```

In dev the app proxies `/api` to `localhost:8787`, so the browser stays on one
origin and session cookies work without CORS configuration.

## Deploying

Each app deploys independently:

```bash
pnpm --filter website deploy
pnpm --filter app deploy
pnpm --filter api deploy
```

Before the first API deploy: `pnpm db:migrate:remote` and
`wrangler secret put SESSION_SECRET`. Set `APP_ORIGIN` in `apps/api/wrangler.jsonc`
to the deployed app's origin, and `VITE_APP_URL` / `VITE_API_URL` for the frontends.

## Infrastructure

Everything runs on Cloudflare:

- **Workers Static Assets** serves both frontends — no separate Pages project.
- **Workers** runs the Hono API.
- **D1** is the database (see below).
- **R2** is wired but commented out in `apps/api/wrangler.jsonc`, for when you
  add photo uploads or Excel imports.

## Why D1 (SQLite) and not a NoSQL store

You asked for NoSQL on the reasoning that every user is unique. That instinct is
right about *isolation* — no teacher should ever see another teacher's learners —
but isolation is a query-scoping concern, not a schema-shape one. Every query in
this codebase is scoped by `teacher_id`, which gives you the isolation without
giving up joins.

The data itself is strongly relational and highly uniform. Every teacher has the
same shape of record, because DepEd mandates it: learners, sections, the three
components (Written Work / Performance Tasks / Quarterly Assessment), four
quarters. The questions you will actually ask are joins:

> "For every learner in this section, sum their scores per component for Q1,
> divide by the highest possible, and apply the weights."

That is one SQL query. In a document store it is a fan-out read plus
application-side aggregation, and you would end up denormalizing scores into the
student document — at which point renaming an assessment means rewriting every
learner's document.

Concretely, D1 gives you:

- **Real aggregates.** The grades endpoint is a single `GROUP BY`.
- **Referential integrity.** `ON DELETE CASCADE` means removing a class cannot
  strand orphan score rows.
- **Cheap correctness.** `CHECK` constraints keep quarter in 1–4 and sex in M/F
  at the storage layer, not just in application code.
- **Free tier that fits.** 5GB storage, 5M reads/day. A teacher with 200 learners
  and 40 assessments per quarter is roughly 32k score rows — a rounding error.
- **It is the Cloudflare-native choice**, which is what you asked for.

If you later hit a genuine per-teacher scale wall, the Cloudflare answer is
**Durable Objects with SQLite storage** — one DO per teacher, which gives literal
physical isolation *and* keeps SQL. That is a better destination than a document
store, and the schema here ports to it nearly unchanged.

Where NoSQL does earn its place here: **KV** for session lookups if auth ever gets
hot, and **R2** for uploaded files. Both are already anticipated in the config.

## Portability

All SQL lives in [apps/api/src/db](apps/api/src/db) — routes deal in domain
objects and never see a placeholder or a column name. The dialect-specific
pieces each have one home: `db/database.ts` aliases the driver type,
`db/mappers.ts` absorbs row shapes, and `db/errors.ts` normalizes constraint
violations. Moving to Postgres later means rewriting query bodies in one
directory rather than picking SQL out of five route files.

## Grading correctness

`apps/api/src/lib/grading.ts` implements DepEd Order No. 8, s. 2015 — the six
component-weight profiles and the transmutation table. The transmutation
function was verified against all 41 published table rows at the low, middle, and
high of each band.

Note that for Grades 1–10 the weights depend on the **subject group**, not just
the grade level: Languages/AP/EsP are 30/50/20, Science and Math are 40/40/20,
and MAPEH/EPP/TLE are 20/60/20. That is why a section stores a `weight_profile`
rather than a track.

## Status

The backend is complete and exercised end to end: signup, login, sessions,
classes, learners, assessments, bulk score entry, and computed quarterly grades,
including cross-teacher isolation checks.

The frontend is a working skeleton — sign in, list classes, view a class list.
The class-record grid (score entry) and the grade sheet are the next screens to
build; their endpoints already exist.
