# Supabase Auth swap + admin-only lecturer accounts: Design

**Date:** 2026-07-22
**Status:** draft, pending review
**Issue:** #10 "Config Auth" — *config auth with supabase for only admin can create
account for lecturer for now*

## Purpose

Replace the temporary dev-token auth scheme with real Supabase Auth, end to end:

- A real **login page** (email + password) issues a live Supabase session; the
  frontend attaches that session's access token to every API call instead of the
  static `NEXT_PUBLIC_DEV_TOKEN`.
- The backend **verifies Supabase-issued JWTs** at the existing swap point
  (`core/auth/token.ts` + `core/auth/middleware.ts`) and resolves the caller to an
  app `User` — nothing downstream of `req.user` changes.
- **Only admins can create lecturer accounts.** Account provisioning moves behind a
  new admin-only permission and uses the Supabase Admin API (service_role key) to
  mint the credential + invite, then links it to a `User` profile row.

The dev-token path is retired for the app, but kept available behind an explicit
`AUTH_MODE=dev` flag so local development and CI can run without a live Supabase
project.

## Decisions (settled during scoping)

1. **App `User.role` is the source of truth for authorization, not a token claim.**
   Supabase tokens carry an auth uid + email; the backend looks the user up in our
   DB and uses `User.role`. This keeps the whole authorization surface auditable in
   our own `ROLE_PERMISSIONS` map and means an admin changes roles in our DB, not in
   Supabase metadata. Consequence: `requireAuth` becomes **async** (one DB lookup).
2. **Link via `User.authId`, not by overloading `User.id`.** New nullable, unique
   column mapping to Supabase `auth.users.id`. Keeps the profile table and all
   existing relations (`CourseLecturer`, `OfferingLecturer`) untouched. Lookup falls
   back to email so pre-existing seeded profiles link on first login.
3. **Admin-only creation is a new permission (`accounts:create`), not `lecturers:write`.**
   `lecturers:write` is held by lecturers too, so it cannot be the gate. The new
   permission is granted to `admin` only. The existing `POST /api/lecturers`
   (profile CRUD) is unchanged; the new account-provisioning endpoint is separate.
4. **Provisioning uses `inviteUserByEmail` (service_role), not a set password.**
   Admin enters the lecturer's name + email; Supabase sends an invite email and the
   lecturer sets their own password. No plaintext password ever transits our API.
   `admin.createUser` with a temp password is the fallback if email delivery is not
   configured (documented, not default).
5. **Backend verifies via JWKS (asymmetric), with HS256 fallback.** New Supabase
   projects sign with a rotating asymmetric key exposed at a JWKS URL; `jose`
   verifies against it. Legacy projects (shared HS256 secret) are supported by
   setting `SUPABASE_JWT_SECRET` instead. Exactly one is configured per environment.
6. **`AUTH_MODE` flag preserves the dev path.** `AUTH_MODE=supabase` (prod/staging)
   verifies Supabase tokens; `AUTH_MODE=dev` (local/CI default when no Supabase env
   is present) keeps the current HS256-with-`JWT_SECRET` behavior and `gen-token`.
   This is the one place the two schemes coexist, so tests and offline dev still run.

## Data model

`apps/backend/prisma/schema.prisma`, on `model User`:

```prisma
model User {
  id            String   @id @default(uuid())
  authId        String?  @unique   // Supabase auth.users.id; null until first login
  email         String   @unique
  ...
}
```

New migration via `bun run --cwd apps/backend db:migrate`. `authId` is nullable so
existing rows migrate cleanly; it is populated on first successful login (match by
email) or at creation time for admin-provisioned lecturers.

## Backend — the swap point (`core/auth`)

### `token.ts`

Today: `verifyToken(token) -> AuthUser` is pure/sync HS256. New shape:

- Add `AUTH_MODE` (`"supabase" | "dev"`, default `dev`).
- `verifyToken` stays for `dev` mode.
- New `verifySupabaseToken(token) -> { authId, email }` using `jose`:
  `createRemoteJWKSet(SUPABASE_JWKS_URL)` + `jwtVerify`, or `jwtVerify` with the
  shared `SUPABASE_JWT_SECRET` when set. Returns only identity (uid + email) — the
  role is resolved from our DB, per decision 1.
- `AuthUser` type is unchanged, so every plugin and permission check is untouched.

### `middleware.ts`

`requireAuth` becomes `async`:

1. Read Bearer token (unchanged).
2. `dev` mode → `verifyToken` (as today).
3. `supabase` mode → `verifySupabaseToken` → look up `User` by `authId` (fallback
   `email`); if found by email with null `authId`, backfill `authId`. If no `User`
   row exists → **403** (`No account provisioned for this login`) — a Supabase login
   with no app profile is not authorized. Set `req.user = { id, email, role }` from
   the `User` row.

Express handles async middleware that calls `next()`/`next(err)`; no route signatures
change.

## Backend — admin-only account provisioning (new `auth` concern)

New permission in `core/permissions/index.ts`:

- Add `"accounts:create"` to `admin` only (not `lecturer`, not `student`).

New endpoint. Two placement options — chosen: a small **`auth` plugin** (`plugins/auth/`)
so it follows the registry pattern and keeps the Supabase Admin client isolated:

- `POST /api/auth/accounts` — `requireAuth` + `requirePermission("accounts:create")`.
- Body (new shared schema `CreateAccountInput`): `{ name, email, role: "lecturer" }`
  (role fixed to `lecturer` for now per the issue; schema allows widening later).
- Service: create a Supabase Admin client with `SUPABASE_SERVICE_ROLE_KEY`
  (server-only, never shipped to the browser), call `auth.admin.inviteUserByEmail(email)`,
  then upsert the app `User` (`role: lecturer`, `authId` = returned uid, plus name).
  Idempotent on email (re-invite reuses the row), mirroring how the lecturers
  service treats existing emails.

The Supabase Admin client lives only in this plugin's service — the service_role key
never leaves the backend.

## Shared types (`packages/shared-types`)

- New `src/auth.ts`: `CreateAccountInput = z.object({ name, email, role: z.enum(["lecturer"]) })`
  and its inferred type; export from the package index.
- Add the `auth` plugin manifest to `pluginManifests` in `src/plugins.ts` **only if**
  it should surface in the sidebar. Decision: no nav entry — account creation is an
  admin action embedded in the Lecturers page, not its own top-level route. So the
  endpoint is registered in `core/app.ts` without a manifest nav entry (or with a
  manifest whose section is hidden). See open question O1.

## Frontend — login, session, token source

### Supabase client + session

- Add `@supabase/supabase-js`. New `lib/supabase.ts` creating the browser client from
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `lib/api.ts`: replace the static `DEV_TOKEN` with
  `const { data } = await supabase.auth.getSession()` →
  `session.access_token`. This is still the *single* place the bearer token is
  attached (the isolation the file was built for). `request()` already async.
  Fall back to `NEXT_PUBLIC_DEV_TOKEN` when `NEXT_PUBLIC_AUTH_MODE=dev`.

### Login page + guard

- New `app/login/page.tsx` (outside the `(shell)` group): email/password form calling
  `supabase.auth.signInWithPassword`. On success → redirect to `/`.
- `app/(shell)/layout.tsx`: guard — if no session, redirect to `/login`. Implemented
  client-side via a small `AuthGuard` (or middleware.ts route matcher) that reads the
  Supabase session.
- Invite-acceptance / set-password: Supabase invite links land on a
  `app/auth/callback` route that exchanges the code and lets the user set a password.

### Identity + sign-out

- `topbar.tsx`: show the signed-in user's email + role and a Sign out button
  (`supabase.auth.signOut()` → `/login`). Requires knowing the current user — add a
  lightweight `GET /api/auth/me` returning `req.user`, or read email from the
  Supabase session client-side and role from `/api/auth/me`.

### Admin: create lecturer account

- On `app/(shell)/lecturers/`, add a "Create login account" action (admin-only, gated
  by the current user's role) opening a small form (name + email) that calls
  `POST /api/auth/accounts`. Distinct from the existing "Add lecturer" *profile* form;
  copy should make the difference clear ("sends an invite email").

## Config / secrets / env

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | public client key |
| `NEXT_PUBLIC_AUTH_MODE` | frontend | `supabase` \| `dev` |
| `SUPABASE_URL` | backend | Admin API base |
| `SUPABASE_SERVICE_ROLE_KEY` | backend (secret) | admin `inviteUserByEmail` |
| `SUPABASE_JWKS_URL` *or* `SUPABASE_JWT_SECRET` | backend | token verification |
| `AUTH_MODE` | backend | `supabase` \| `dev` |

`.env.example` files (backend + frontend) updated. `DEPLOY.md` gains a "Supabase Auth"
section replacing the "no Supabase Auth yet" note. Render gets the service_role key as
a secret; Vercel gets the public vars.

## Migration & rollout

1. Prisma migration adds `User.authId`.
2. Enable email auth in the Supabase dashboard; configure the invite email template +
   redirect URL (`app/auth/callback`).
3. Provision the first admin: either `admin.createUser` via a one-off script, or
   invite `admin@dse.dev` and set its `User.role = admin` (seeded already). Seed script
   gains an optional step to invite seeded users when `AUTH_MODE=supabase`.
4. Existing seeded lecturers link on first login by email → `authId` backfilled.
5. `gen-token` stays for `AUTH_MODE=dev` only; documented as dev-only.

## Testing

- `packages/shared-types`: unit test `CreateAccountInput` (bun:test, colocated).
- Backend: once `apps/backend` gains tests, cover `requireAuth` role resolution
  (found by authId, found by email + backfill, no profile → 403) and the
  `accounts:create` permission gate (lecturer → 403, admin → 201). Supabase Admin
  calls mocked.

## Out of scope

- Password reset / account recovery UI beyond Supabase's built-in flows.
- Student self-signup or student login (students are data rows, not auth users, today).
- Role management UI (changing a user's role) — still a DB operation for now.
- Row-level security in Postgres (auth stays app-enforced via `ROLE_PERMISSIONS`).

## Open questions

- **O1 — auth plugin manifest/nav:** register the account endpoint via a hidden
  manifest, or mount it directly in `core/app.ts` without a manifest? Leaning:
  minimal manifest with no `state: "ready"` nav entry, to stay consistent with the
  registry pattern while keeping it off the sidebar.
- **O2 — JWKS vs shared secret for the target Supabase project:** determines whether
  `SUPABASE_JWKS_URL` or `SUPABASE_JWT_SECRET` is wired. Pick once the project exists.
- **O3 — invite vs temp-password** default, depending on whether Supabase email
  delivery is configured for the project.
