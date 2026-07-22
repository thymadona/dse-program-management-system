# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DSE Program Management System — a modular monolith with a plugin registry, currently
implementing the RUPP course-specification syllabus (Part 1 programme reference +
Part 2 §1–25 course spec wizard) plus Students/Courses/Offerings/Lecturers CRUD.
Auth is a temporary local JWT dev-token scheme, deliberately isolated so it can be
swapped for Supabase Auth later without touching plugin code.

## Commands

```bash
bun install                            # install all workspaces
bun run db:up                          # start Postgres via Docker (docker-compose.yml)
bun run --cwd apps/backend db:migrate  # apply Prisma migrations (dev)
bun run seed                           # seed dev users + sample data
bun run gen-token --role admin         # mint a dev JWT (roles: admin | lecturer | student)

bun run dev                            # turbo: backend :4000 + frontend :3000 together
bun run build                          # turbo: build all workspaces
bun run lint                           # turbo: lint all workspaces (frontend only defines one, via next lint)
bun run typecheck                      # turbo: tsc --noEmit in every workspace
```

Testing: only `packages/shared-types` currently has tests (`bun:test`, files named
`*.test.ts`, colocated with the source they test — see `course-spec.test.ts`).
Run all of them with `bun test` from the repo root, or scope to one file with
`bun test src/course-spec.test.ts` from inside `packages/shared-types`.
`apps/backend` has a `test` script (`bun test`) wired for when it gains tests, but has none yet.

Deploy target/process (Supabase → Render → Vercel, dev-token auth) is documented in `DEPLOY.md`.

## Architecture

### Monorepo

Bun workspaces (`apps/*`, `packages/*`) + Turborepo. `packages/shared-types` is the
single source of truth for the plugin contract, permission strings, and every Zod
schema — both `apps/backend` and `apps/frontend` import it, so frontend/backend
payloads cannot drift. `packages/config` holds the shared `tsconfig.base.json` and
Tailwind preset (design tokens); `packages/ui` holds shared React primitives
(DataTable, StatusBadge, TableToolbar, Radix-based inputs).

### Plugin registry (backend)

Each domain (`students`, `courses`, `offerings`, `lecturers`, `methods`) lives under
`apps/backend/src/plugins/<id>/` as `index.ts` (exports a `DSEPlugin` — manifest +
router + service) + `router.ts` + `service.ts`. `core/app.ts` is the only place
plugins are registered (`registry.register(...)`) and is deliberately domain-agnostic:
it just mounts every registered router at `/api/{id}` and serves `/api/registry` for
introspection. The frontend sidebar nav (`app/(shell)/sidebar.tsx` via
`navFromManifests`) is generated from that same manifest list, so a new plugin's nav
entry appears automatically once its manifest is added to `pluginManifests` in
`packages/shared-types/src/plugins.ts`.

**Cross-plugin calls always go through `registry.get('<id>').service`** — never a
direct import between `plugins/*` directories. This is the in-process equivalent of
an API call and is what lets a plugin be added or removed without touching others
(see the "Adding a plugin later" section in `README.md`).

### Auth & permissions

`core/auth/token.ts` mints/verifies HS256 JWTs; `core/auth/middleware.ts`
(`requireAuth`) is the only place a raw token is read and sets `req.user`.
`core/permissions/index.ts` holds the single `ROLE_PERMISSIONS` map (role →
permission strings) and the `requirePermission(...)` guard factory — plugins declare
which permission a route needs, this map is the one auditable place deciding which
roles hold it. Every plugin router calls `requireAuth` then
`requirePermission("<id>:read"|"<id>:write")` per route.

Auth is intentionally swappable: only `token.ts` / `middleware.ts` change when real
Supabase Auth replaces the dev-token scheme (`lib/api.ts` on the frontend is the
single place the bearer token is attached, for the same reason).

### Course Specification wizard

This is the largest and most active domain, defined entirely in
`packages/shared-types/src/course-spec.ts`:

- `SPEC_SECTIONS` is the ordered registry driving the wizard stepper (`id`, `title`,
  syllabus `ref` like `"§16"`, `part`, and `state: "ready" | "soon"` for
  not-yet-implemented sections). Storage is one `CourseSpec` row per course
  (`prisma/schema.prisma`), with `data[sectionId]` holding that section's opaque JSON
  and `status[sectionId]` tracking `draft`/`complete` so a lecturer can save one
  section and resume later.
- `SPEC_SECTION_SCHEMAS` maps a `SpecSectionId` to its Zod schema. The backend route
  `PUT /api/courses/:id/spec/:sectionId` (`plugins/courses/router.ts`) looks up the
  schema for the given section id and 400s if the section isn't implemented yet —
  this is the only validation gate for section saves, so adding a new section means
  adding its schema here and to `SPEC_SECTION_SCHEMAS`.
- Sections reference each other by stable code, not id: CLOs (§14) are `CLO1`,
  `CLO2`… by position; §15 CLO→PLO mapping rows and §16 SLT content-topic rows both
  carry a `cloCode` pointing back to a §14 CLO. Derived values cascade within a
  section: in §15 the lecturer enters SLT hours per CLO (validated to sum to the
  course-level total SLT), and Focus % / F-M-P are computed from each CLO's share of
  that total (`clo-mapping-section.tsx`). In §16 (`slt-section.tsx`) content rows
  carry an L/T/P/O breakdown per delivery mode while assessment rows carry per-mode
  hours plus a manual grade weight; §16 and §15 are independent. When touching one of
  these sections, check whether a derived-value invariant crosses into a sibling
  section before assuming the change is local.
- Reference constants (`PLOS`, `COGNITIVE_LEVELS`/`AFFECTIVE_LEVELS`/`PSYCHOMOTOR_LEVELS`,
  `FOCUS_LEVELS`, `SLT_ACTIVITIES`, `LETTER_GRADES`) back the dropdowns/inline guides
  and are fixed programme data, not user-editable.
- `TeachingMethod`/`AssessmentMethod` (the `methods` plugin) are global vocabularies
  shared across all courses that grow as lecturers add new methods from the §15 form
  — an add of an existing name reuses the row rather than duplicating it.

### Frontend

Next.js App Router. `app/(shell)/` is the authenticated shell (sidebar + topbar);
each plugin gets a route segment there. The course spec wizard lives under
`app/(shell)/courses/[id]/spec/`, one `*-section.tsx` file per wizard section plus
`spec-client.tsx` orchestrating the stepper. `lib/*.ts` (one file per plugin, e.g.
`students.ts`, `course-spec.ts`) wraps `lib/api.ts` with typed calls built on the
shared Zod schemas — this is the layer to extend when a plugin gains new endpoints.

Runs on **Next.js 16 / React 19** with Turbopack (`next.config.mjs` pins the
monorepo `root` so an unrelated parent-dir lockfile can't confuse it). Consequently
route `params`/`searchParams` are **async** — a page/layout must be `async` and
`await params` before reading it (see `courses/[id]/spec/page.tsx`); the old
synchronous `{ params }: { params: { id } }` shape no longer works.

### Spec-driven development workflow

Feature work in this repo follows the `superpowers` skill's spec → plan → tasks
workflow: `docs/superpowers/specs/<date>-<feature>-design.md` and
`docs/superpowers/plans/<date>-<feature>.md` hold the design/plan for a feature
branch, and `.superpowers/sdd/` holds per-task briefs, subagent reports, and
review diffs plus a running `progress.md` for the branch. Check these before
assuming a branch's intent needs to be re-derived from the diff alone.
