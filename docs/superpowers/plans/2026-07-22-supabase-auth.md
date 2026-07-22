# Supabase Auth swap: Implementation plan

**Spec:** `docs/superpowers/specs/2026-07-22-supabase-auth-design.md`
**Branch:** `feat/supabase-auth`

Ordered so each phase leaves the app working. Phases 1–3 are additive and preserve
current dev-token behavior (`AUTH_MODE=dev` default); nothing breaks until Supabase
env is deliberately switched on.

## Phase 1 — Foundation (credential-independent, behavior-preserving)

1. **Shared types** — `packages/shared-types/src/auth.ts`: `CreateAccountInput`
   (`{ name, email, role: "lecturer" }`) + export from index. Colocated `*.test.ts`.
2. **Permission** — `core/permissions/index.ts`: add `"accounts:create"` to `admin`.
3. **`AUTH_MODE` scaffolding** — `core/auth/token.ts`: add `AUTH_MODE` (default
   `dev`), keep `verifyToken` for dev. No behavior change when unset.
4. **DB** — `schema.prisma` `User.authId String? @unique`; migration.

## Phase 2 — Backend Supabase verification + provisioning

5. **`verifySupabaseToken`** in `token.ts` using `jose` (JWKS or shared secret).
6. **`requireAuth` async** in `middleware.ts`: dev vs supabase branch; resolve
   `User` by authId→email(+backfill)→403.
7. **`auth` plugin** — `plugins/auth/{index,router,service}.ts`:
   `POST /api/auth/accounts` (`accounts:create`) → Supabase Admin
   `inviteUserByEmail` + upsert `User`; `GET /api/auth/me` → `req.user`. Register in
   `core/app.ts`.

## Phase 3 — Frontend login + token source

8. **`@supabase/supabase-js`** dep + `lib/supabase.ts` browser client.
9. **`lib/api.ts`** — bearer token from `supabase.auth.getSession()`, dev fallback.
10. **`app/login/page.tsx`** + `app/auth/callback` (invite/set-password).
11. **Guard** in `app/(shell)/layout.tsx`; **topbar** identity + sign-out (`/api/auth/me`).
12. **Admin action** on Lecturers page: "Create login account" → `POST /api/auth/accounts`.

## Phase 4 — Config, docs, rollout

13. `.env.example` (backend + frontend); `DEPLOY.md` Supabase Auth section.
14. Seed/`gen-token` gated to `AUTH_MODE=dev`; optional invite-seeded-users step.
15. Provision first admin; verify end-to-end against the real project.

## Dependencies / blockers

- Phases 2–4 runtime verification needs a real Supabase project: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, JWKS URL **or** JWT secret, anon key. Code builds
  against env without it; it cannot authenticate until provided.
- Open questions O1 (manifest/nav), O2 (JWKS vs secret), O3 (invite vs temp password)
  resolve during Phase 2/4 once the project exists.
