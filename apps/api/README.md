# DepEd ToolKit API

Hono on Cloudflare Workers, backed by D1.

## First-time setup

```bash
pnpm install

# 1. Create the database and paste the printed id into wrangler.jsonc
pnpm wrangler d1 create depedtoolkit

# 2. Apply the schema
pnpm db:migrate:local     # local dev replica
pnpm db:migrate:remote    # production

# 3. Session signing key
cp .dev.vars.example .dev.vars              # local
pnpm wrangler secret put SESSION_SECRET     # production

pnpm dev    # http://localhost:8787
```

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Register a teacher |
| POST | `/api/auth/login` | Start a session |
| POST | `/api/auth/logout` | End the session |
| GET | `/api/auth/me` | Current teacher |
| GET | `/api/sections` | List the teacher's classes |
| POST | `/api/sections` | Create a class |
| GET | `/api/sections/:id` | Class detail + class list |
| DELETE | `/api/sections/:id` | Archive a class |
| POST | `/api/sections/:id/students` | Add and enroll a learner |
| GET | `/api/sections/:id/assessments` | Class record columns (`?quarter=1`) |
| POST | `/api/sections/:id/assessments` | Add a column |
| PUT | `/api/assessments/:id/scores` | Save a whole column of scores |
| GET | `/api/sections/:id/quarters/:q/grades` | Computed quarterly grades |

## Layout

```
src/
  index.ts        app composition, CORS, error handling
  schema.ts       zod input validation
  types.ts        domain objects (camelCase) shared with routes
  routes/         validate -> authorize -> call db -> shape response
  middleware/     session cookie handling
  lib/            grading rules, password hashing
  db/             every SQL statement in the app
```

`src/db/` is the only directory that knows SQL exists. Routes receive domain
objects with camelCase fields and never see a `?` placeholder or a snake_case
column. Three files hold everything dialect-specific:

- `db/database.ts` — the driver type, aliased once as `Database`
- `db/mappers.ts` — row shapes and the snake_case to camelCase translation
- `db/errors.ts` — normalizes constraint violations into typed errors, since
  SQLite reports them in the message and Postgres as SQLSTATE 23505

What remains inline is `unixepoch()` and `?` placeholders. Porting to Postgres
means rewriting the query bodies under `db/` and nothing above them.

## Grading

`src/lib/grading.ts` implements DepEd Order No. 8, s. 2015: per-component
percentage scores, the six weight profiles, and the transmutation table
(verified against all 41 published rows).

`GET .../grades?missing=ignore` (default) grades only the work recorded so far.
`?missing=zero` counts every assessment in the class record — use it once the
quarter is closed.
