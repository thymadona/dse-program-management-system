import type { LecturersServiceContract } from "@dse-pms/shared-types";
import { prisma } from "../../core/db/prisma.ts";

/**
 * Lecturers = Users with role "lecturer". Read-only. Exposed as the public
 * service so Courses and Offerings can resolve lecturers via the registry.
 * Implements LecturersServiceContract — the cross-plugin surface.
 */
export const lecturerService: LecturersServiceContract = {
  list() {
    return prisma.user.findMany({
      where: { role: "lecturer" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
  },

  getById(id: string) {
    return prisma.user.findFirst({
      where: { id, role: "lecturer" },
      select: { id: true, name: true, email: true },
    });
  },
};

export type LecturerService = typeof lecturerService;
