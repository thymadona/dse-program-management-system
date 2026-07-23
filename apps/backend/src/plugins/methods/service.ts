import type { CreateMethodInput, Method, MethodsResponse } from "@dse-pms/shared-types";
import { prisma } from "../../core/db/prisma.ts";

/**
 * Method vocabulary business logic. Two global reference tables read by the §14
 * CLO course-spec form. Adding a method is idempotent on `name`: an existing name
 * returns the existing row (created=false) rather than erroring.
 */
export const methodService = {
  async list(): Promise<MethodsResponse> {
    const select = { id: true, name: true } as const;
    const [teaching, assessment] = await Promise.all([
      prisma.teachingMethod.findMany({ orderBy: { name: "asc" }, select }),
      prisma.assessmentMethod.findMany({ orderBy: { name: "asc" }, select }),
    ]);
    return { teaching, assessment };
  },

  async addTeaching(input: CreateMethodInput): Promise<{ method: Method; created: boolean }> {
    const select = { id: true, name: true } as const;
    try {
      const method = await prisma.teachingMethod.create({ data: { name: input.name }, select });
      return { method, created: true };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        const existing = await prisma.teachingMethod.findUnique({ where: { name: input.name }, select });
        if (existing) return { method: existing, created: false };
      }
      throw err;
    }
  },

  async addAssessment(input: CreateMethodInput): Promise<{ method: Method; created: boolean }> {
    const select = { id: true, name: true } as const;
    try {
      const method = await prisma.assessmentMethod.create({ data: { name: input.name }, select });
      return { method, created: true };
    } catch (err) {
      if ((err as { code?: string }).code === "P2002") {
        const existing = await prisma.assessmentMethod.findUnique({ where: { name: input.name }, select });
        if (existing) return { method: existing, created: false };
      }
      throw err;
    }
  },
};

export type MethodService = typeof methodService;
