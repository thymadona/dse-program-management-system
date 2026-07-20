import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient for the process. In dev with --watch we cache it on
 * globalThis so hot reloads don't open a new connection pool each time.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
