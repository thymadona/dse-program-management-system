import type {
  CoursesServiceContract,
  CreateCourseInput,
  LecturersServiceContract,
  ListCoursesQuery,
  UpdateCourseInput,
} from "@dse-pms/shared-types";
import { prisma } from "../../core/db/prisma.ts";
import { registry } from "../../core/plugins/registry.ts";

/**
 * Courses business logic. The lecturer relationship is validated through the
 * registry (registry.get('lecturers')) rather than by importing the lecturers
 * plugin — the in-process equivalent of calling its API.
 */

/** Thrown when an input references something that doesn't exist. */
export class ReferenceError extends Error {}

function lecturers(): LecturersServiceContract {
  return registry.get<LecturersServiceContract>("lecturers").service;
}

async function assertLecturerExists(lecturerId: string | null | undefined): Promise<void> {
  if (!lecturerId) return;
  const lecturer = await lecturers().getById(lecturerId);
  if (!lecturer) throw new ReferenceError("Assigned lecturer does not exist");
}

/** Attach the lecturer summary to a course row for API responses. */
async function withLecturer<T extends { lecturerId: string | null }>(course: T) {
  const lecturer = course.lecturerId ? await lecturers().getById(course.lecturerId) : null;
  return { ...course, lecturer };
}

export const courseService = {
  async list(query: ListCoursesQuery) {
    const { search } = query;
    const courses = await prisma.course.findMany({
      where: search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" } },
              { title: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { code: "asc" },
    });
    return Promise.all(courses.map(withLecturer));
  },

  // Part of CoursesServiceContract — used by the offerings plugin via the registry.
  getById(id: string) {
    return prisma.course.findUnique({ where: { id } });
  },

  async getDetailed(id: string) {
    const course = await prisma.course.findUnique({ where: { id } });
    return course ? withLecturer(course) : null;
  },

  async create(input: CreateCourseInput) {
    await assertLecturerExists(input.lecturerId);
    const course = await prisma.course.create({ data: input });
    return withLecturer(course);
  },

  async update(id: string, input: UpdateCourseInput) {
    await assertLecturerExists(input.lecturerId);
    const course = await prisma.course.update({ where: { id }, data: input });
    return withLecturer(course);
  },

  async remove(id: string) {
    return prisma.course.delete({ where: { id } });
  },
} satisfies CoursesServiceContract & Record<string, unknown>;

export type CourseService = typeof courseService;
