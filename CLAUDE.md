# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (Bun workspaces + Turborepo):

```bash
bun install
bun run dev            # turbo: backend :4000 + frontend :3000
bun run build
bun run typecheck      # tsc --noEmit across workspaces
bun run lint           # only the frontend defines lint (next lint)

bun run db:up / db:down            # local Postgres via docker-compose
bun run db:migrate                 # prisma migrate dev (apps/backend)
bun run seed                       # dev users + sample data
bun run gen-token --role admin     # mint dev JWT (roles: admin | lecturer | student)
```

Tests use `bun test` (currently only `apps/backend` declares a `test` script; specs live next to sources as `*.test.ts`):

```bash
bun test                                              # from a workspace dir
bun test packages/shared-types/src/course-spec.test.ts # single file
bun test --test-name-pattern "<name>"                  # single test
```

First-run setup and deployment (Supabase + Render + Vercel) are documented in `README.md` and `DEPLOY.md`. `.env.example` covers both apps; backend env goes in `apps/backend/.env`, frontend in `apps/frontend/.env.local`.

## Architecture

Modular monolith with an in-process **plugin registry**. Core (auth, permissions, registry, Prisma) knows nothing about any domain; every domain is a plugin.

**Adding a plugin touches three places** — everything else (sidebar nav, `/api/<id>` mount, `/api/registry`) derives automatically:

1. `packages/shared-types/src/plugins.ts` — add a `PluginManifest` and append it to `pluginManifests`. This single file drives both the backend mount points and the frontend sidebar, so the two can't drift.
2. `apps/backend/src/plugins/<id>/{index,router,service}.ts` — export a `BackendPlugin<TService>`, then `registry.register(...)` it in `core/app.ts` (the only place plugins are listed).
3. `apps/frontend/app/(shell)/<id>/page.tsx` — server page renders `<Topbar>` + a `"use client"` client component that calls `lib/<id>.ts`.

**Cross-plugin access is contract-only.** A plugin never imports another plugin's internals. It depends on an interface in `packages/shared-types/src/contracts.ts` (e.g. `StudentsServiceContract`) and resolves it at request time via `registry.get<Contract>("students").service`. The `*Ref` shapes are deliberately lean so each concrete Prisma-backed service is structurally assignable.

**Auth/permissions.** `core/auth/token.ts` mints/verifies local HS256 JWTs; `core/auth/middleware.ts` is the only reader of the raw token and sets `req.user`. Every plugin router does `router.use(requireAuth)` and guards each route with `requirePermission("<id>:read"|":write")`. The role→permission map lives centrally in `core/permissions/index.ts` — when adding a plugin, add its permission strings there for each role, not in the plugin. Swapping to Supabase auth is intended to touch only `token.ts`/`middleware.ts` on the backend and the token source in `apps/frontend/lib/api.ts`.

**Validation boundary.** Zod schemas in `@dse-pms/shared-types` are imported by both apps. Routers `safeParse` query/body and return `400 { error, details: flatten() }`; services throw, and routers map errors to status (`ReferenceError` → 400, Prisma `P2002` → 409, `P2025` → 404). The frontend `lib/api.ts` wrapper unwraps `{ error }` bodies into an `ApiError(status, message)`.

**Course Specification (the largest feature).** The RUPP syllabus Part 2 §1–25 is one JSON document per course: `CourseSpec.data[sectionId]` holds content, `CourseSpec.status[sectionId]` tracks `draft|complete` so a lecturer can save and resume. `packages/shared-types/src/course-spec.ts` is the source of truth — `SPEC_SECTIONS` (ordered stepper, each `state: "ready" | "soon"`), the reference constants (Bloom C/A/P levels, PLOs, focus codes, grade scale), and `SPEC_SECTION_SCHEMAS` mapping a section id to its Zod schema. The generic endpoint `PUT /api/courses/:id/spec/:sectionId` refuses any section absent from `SPEC_SECTION_SCHEMAS`, so implementing a new section = add its schema + register it + add the matching UI component under `app/(shell)/courses/[id]/spec/`. Section components export `EMPTY_*`, `to*Form`, and `to*Payload` helpers; `spec-client.tsx` owns all section state and saving.

Some spec fields are stored outside the JSON blob — `courseInfo` writes through to `Course` columns, and §10/§12 fields live on `Offering` — so check `courses/service.ts:saveSection` before assuming a field is JSON-only.

**Method vocabulary (§15).** `TeachingMethod` / `AssessmentMethod` are global, name-unique tables shared by all courses, served by the `methods` plugin (manifest with no `routes`, so no sidebar entry). Adding an existing name reuses the row rather than failing.

## Conventions

- Backend imports use explicit `.ts` extensions (Bun ESM), e.g. `import { prisma } from "../../core/db/prisma.ts"`.
- Shared UI primitives and components come from `@dse-pms/ui` (`DataTable`, `StatusBadge`, `TableToolbar`, plus `primitives/`); design tokens live in `packages/config/tailwind-preset.ts`.
- Frontend pages are server components that delegate to a sibling `*-client.tsx`; API access is centralised in `apps/frontend/lib/<domain>.ts` on top of `lib/api.ts`.
- Prisma schema/migrations live in `apps/backend/prisma/`; `prisma/seed.ts` seeds one user per role.
