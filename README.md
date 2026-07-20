# DSE-PMS

DSE Program Management System — a modular monolith with a plugin registry.
This is the **thin vertical slice**: core (auth + permissions + registry + DB) plus
the **Students** plugin end-to-end, proving the plugin pattern before Courses and
Offerings are added.

## Stack

- **Monorepo:** Bun workspaces + Turborepo
- **Backend:** Express + Prisma + PostgreSQL (local, via Docker)
- **Frontend:** Next.js (App Router) + Tailwind + shared `@dse-pms/ui`
- **Auth:** local HS256 JWT (swappable for Supabase later — only `token.ts`/`middleware.ts` change)
- **Contract:** Zod schemas + plugin manifest in `@dse-pms/shared-types`, imported by both apps

```
apps/backend   Express API — core/ + plugins/students/
apps/frontend  Next.js — app/(shell)/ + Students page
packages/shared-types  DSEPlugin contract, plugin manifest, Zod schemas
packages/ui            DataTable, StatusBadge, TableToolbar (+ deferred stubs)
packages/config        shared tsconfig + Tailwind preset (design tokens)
```

## First run

```bash
bun install                       # install all workspaces
cp .env.example apps/backend/.env # DATABASE_URL + JWT_SECRET
bun run db:up                     # start Postgres in Docker
bun run --cwd apps/backend db:migrate   # apply migrations
bun run seed                      # seed dev users + sample students

# Mint a dev token and wire it into the frontend (temporary, until real login):
bun run gen-token --role admin    # copy the printed token
# → apps/frontend/.env.local:
#   NEXT_PUBLIC_API_URL="http://localhost:4000"
#   NEXT_PUBLIC_DEV_TOKEN="<paste token>"

bun run dev                       # backend :4000 + frontend :3000
```

Open http://localhost:3000 → redirects to `/students`.

## Roles (seeded users, all via gen-token)

| Role     | students:read | students:write |
|----------|:-------------:|:--------------:|
| admin    | ✅            | ✅             |
| lecturer | ✅            | ❌             |
| student  | ✅            | ❌             |

`bun run gen-token --role student` mints a read-only token — writes return 403.

## Adding a plugin later

1. Add its manifest to `pluginManifests` in `packages/shared-types/src/plugins.ts`.
2. Create `apps/backend/src/plugins/<id>/` (router + service + index) and
   `registry.register(...)` it in `core/app.ts`.
3. Add its page under `apps/frontend/app/(shell)/<id>/`.

The sidebar nav, API mount (`/api/<id>`), and `/api/registry` update automatically.
Cross-plugin access goes through `registry.get('<id>').service` — never a direct import.
