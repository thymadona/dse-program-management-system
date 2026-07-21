# DSE-PMS backend — runs the Express/Bun API on Render.
# Lives at the repo root so the Docker build context is the whole monorepo,
# letting bun resolve the workspace packages (@dse-pms/shared-types, etc.)
# and Prisma. Render's default Dockerfile path (./Dockerfile) picks this up.
FROM oven/bun:1.2.23

WORKDIR /app

# Install all workspace deps from the root lockfile.
COPY . .
RUN bun install --frozen-lockfile

# Generate the Prisma client into the backend workspace.
WORKDIR /app/apps/backend
RUN bunx prisma generate

ENV NODE_ENV=production
# Render provides $PORT; the server reads it (defaults to 4000 locally).
EXPOSE 4000

# Apply any pending migrations, then boot the API.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun src/server.ts"]
