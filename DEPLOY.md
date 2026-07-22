# Deploying DSE-PMS for client review (Phase 1)

Three services, deployed in this order. Auth runs in one of two modes via
`AUTH_MODE`: the temporary dev bearer token (default, this Phase 1 guide), or real
Supabase Auth (see §5). Start on the dev token to get the demo live, then switch.

```
Supabase (Postgres)  →  Render (backend API)  →  Vercel (Next.js frontend)
```

---

## 1. Supabase — the database only

1. Create a free project at https://supabase.com (dashboard → New project). Pick a
   region close to your Render region. Save the database password.
2. Project → **Connect** → **Session pooler** → copy the URI. It looks like:
   ```
   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
   ```
3. Append the schema param Prisma expects:
   ```
   ...pooler.supabase.com:5432/postgres?schema=public
   ```
   Keep this string — it's your `DATABASE_URL`. You do **not** need the anon key,
   service_role key, or any Supabase API key for this phase.

## 2. Render — the backend API

Uses `render.yaml` (Docker build from repo root) and `apps/backend/Dockerfile`.

1. Push this branch to GitHub.
2. Render dashboard → **New → Blueprint** → select this repo. It picks up
   `render.yaml` and creates the `dse-pms-backend` web service.
3. Set these env vars (all marked `sync: false`, so enter them in the dashboard):
   - `DATABASE_URL` — the Supabase string from step 1.
   - `JWT_SECRET` — a real random secret (e.g. `openssl rand -hex 32`).
     Must match what you use to mint the dev token in step 4.
   - `CORS_ORIGIN` — your Vercel URL (fill in after step 3, then redeploy).
4. First deploy runs `prisma migrate deploy` automatically (see Dockerfile CMD).
5. **Seed once, then mint the token** — from Render → the service → **Shell**
   (both `DATABASE_URL` and `JWT_SECRET` are already set there):
   ```
   cd apps/backend
   bun run seed          # gives the client data to look at
   bun run gen-token     # prints an admin JWT — copy the last line
   ```
   Save that token for Vercel step 3 / 4 below.
6. Note the service URL, e.g. `https://dse-pms-backend.onrender.com`.

> Free plan note: the service sleeps after ~15 min idle, so the first request
> after a nap takes ~30–50s to wake. Fine for a demo; mention it to the client.

## 3. Vercel — the frontend

1. Vercel → **Add New → Project** → import this repo.
2. Set **Root Directory** to `apps/frontend`. Framework auto-detects as Next.js.
   (Install still runs from the repo root, so the workspace packages resolve.)
3. Env vars:
   - `NEXT_PUBLIC_API_URL` — the Render URL from step 2.6.
   - `NEXT_PUBLIC_DEV_TOKEN` — see step 4.
4. Deploy, grab the Vercel URL, then go back to Render and set `CORS_ORIGIN` to
   that URL and redeploy the backend.

## 4. The dev token (temporary auth)

The frontend authenticates every request with a single admin bearer token. You
already minted it from the Render Shell in step 2.5 (`bun run gen-token`) — it's
signed with Render's `JWT_SECRET` and knows about the seeded admin user.

Paste that token into Vercel's `NEXT_PUBLIC_DEV_TOKEN` and redeploy the frontend.
Tokens are valid 7 days; re-run `gen-token` from the Render Shell to refresh.

> This is shared, admin-level access for the review — anyone with the site can
> act as admin. That's intentional for a Phase 1 demo. Real Supabase Auth (§5)
> replaces it.

## 5. Supabase Auth (Phase 2)

Switches the app from the shared dev token to per-user login. Roles come from our
own `User.role` (not Supabase metadata), so authorization stays auditable in
`core/permissions`. Only admins can provision lecturer accounts.

Do these in order — steps 1 and 5 are the ones most often forgotten, and either one
silently breaks login.

1. **Run the migration on the production DB.** The `authId` column must exist in
   production, or every authenticated request errors. Against the production
   `DATABASE_URL` (the Render env, i.e. the Supabase Postgres from step 1 of this
   guide):
   ```
   bun run --cwd apps/backend prisma migrate deploy
   ```
2. **Enable Email auth** in the Supabase dashboard (Authentication → Providers →
   Email) and configure the invite email template.
3. **Backend env (Render)** — set:
   - `AUTH_MODE=supabase`
   - `SUPABASE_JWKS_URL=https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`
   - `SUPABASE_URL=https://<ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` — **secret**; never exposed to the browser.
   - `SUPABASE_INVITE_REDIRECT_URL=https://<your-vercel-url>/auth/callback`
     ⚠️ Must be the **deployed** frontend URL, **not** `localhost` — this is where an
     invited lecturer lands to set their password.
4. **Frontend env (Vercel)** — set:
   - `NEXT_PUBLIC_AUTH_MODE=supabase`
   - `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
   (`NEXT_PUBLIC_DEV_TOKEN` is ignored in supabase mode.)
5. **Allow-list the redirect** in Supabase (Authentication → URL Configuration):
   set Site URL to `https://<your-vercel-url>` and add
   `https://<your-vercel-url>/auth/callback` to **Redirect URLs**. Supabase rejects
   any redirect not on this list, so invites break without it. (Add
   `http://localhost:3000/auth/callback` too if you also test locally.)
6. **Provision the first admin.** The seeded `admin@dse.dev` `User` row already has
   `role=admin`; invite that email (Supabase dashboard → Add user → send invite, or
   `admin.createUser`). On first login it links to the existing row by email.
7. **Admins create lecturers** in-app: Lecturers page → **Create login account** →
   name + email → Supabase sends the invite; the lecturer sets a password at
   `/auth/callback` and can sign in. `gen-token` is dev-mode only from here on.

> **Common gotchas.** ① `authId` migration not run on prod → 500s on every request.
> ② `SUPABASE_INVITE_REDIRECT_URL` or the allow-list still on `localhost` → invited
> users can't set a password. ③ Frontend `NEXT_PUBLIC_*` vars missing → login page
> can't reach Supabase. ④ Never commit the `service_role` key; rotate it if it ever
> leaks (chat, logs, screenshots).

---

## Quick verification

- `curl https://dse-pms-backend.onrender.com/health` → `{"ok":true}`
- Open the Vercel URL → data loads, wizard works.
- If the frontend shows CORS errors: `CORS_ORIGIN` on Render must exactly match
  the Vercel origin (no trailing slash), then redeploy the backend.
