import type {
  CoursesServiceContract,
  CreateOfferingInput,
  EnrollInput,
  LecturersServiceContract,
  ListOfferingsQuery,
  OfferingView,
  StudentsServiceContract,
  UpdateOfferingInput,
} from "@dse-pms/shared-types";
import { prisma } from "../../core/db/prisma.ts";
import { registry } from "../../core/plugins/registry.ts";

/**
 * Course Offerings — the architectural proof point. An offering owns only its own
 * tables (Offering, Enrollment); every reference to a Course, Lecturer or Student
 * is resolved through the registry, never by importing those plugins. Swap any of
 * them out and this plugin keeps working as long as the contract holds.
 */

export class ReferenceError extends Error {}
export class CapacityError extends Error {}

// Registry accessors — resolved lazily (registration happens at app boot).
const courses = () => registry.get<CoursesServiceContract>("courses").service;
const lecturers = () => registry.get<LecturersServiceContract>("lecturers").service;
const students = () => registry.get<StudentsServiceContract>("students").service;

/** Assemble an enriched OfferingView by joining across plugins via the registry. */
async function toView(offering: {
  id: string;
  courseId: string;
  lecturerId: string | null;
  term: string;
  capacity: number;
  status: OfferingView["status"];
  createdAt: Date;
  enrollments: { studentId: string }[];
}): Promise<OfferingView> {
  const [course, lecturer, enrolledStudents] = await Promise.all([
    courses().getById(offering.courseId),
    offering.lecturerId ? lecturers().getById(offering.lecturerId) : Promise.resolve(null),
    students().findByIds(offering.enrollments.map((e) => e.studentId)),
  ]);

  return {
    id: offering.id,
    term: offering.term,
    status: offering.status,
    capacity: offering.capacity,
    enrolledCount: offering.enrollments.length,
    createdAt: offering.createdAt.toISOString(),
    course: course ? { id: course.id, code: course.code, title: course.title } : null,
    lecturer: lecturer ? { id: lecturer.id, name: lecturer.name, email: lecturer.email } : null,
    students: enrolledStudents.map((s) => ({ id: s.id, name: s.name, studentId: s.studentId })),
  };
}

const withEnrollments = { enrollments: { select: { studentId: true } } } as const;

export const offeringService = {
  async list(query: ListOfferingsQuery): Promise<OfferingView[]> {
    const offerings = await prisma.offering.findMany({
      where: {
        ...(query.term ? { term: { contains: query.term, mode: "insensitive" } } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: withEnrollments,
      orderBy: [{ term: "desc" }, { createdAt: "desc" }],
    });
    return Promise.all(offerings.map(toView));
  },

  async getById(id: string): Promise<OfferingView | null> {
    const offering = await prisma.offering.findUnique({ where: { id }, include: withEnrollments });
    return offering ? toView(offering) : null;
  },

  async create(input: CreateOfferingInput): Promise<OfferingView> {
    // Validate cross-plugin references through the registry.
    if (!(await courses().getById(input.courseId))) {
      throw new ReferenceError("Course does not exist");
    }
    if (input.lecturerId && !(await lecturers().getById(input.lecturerId))) {
      throw new ReferenceError("Assigned lecturer does not exist");
    }
    const offering = await prisma.offering.create({
      data: {
        courseId: input.courseId,
        term: input.term,
        lecturerId: input.lecturerId ?? null,
        capacity: input.capacity,
        status: input.status,
      },
      include: withEnrollments,
    });
    return toView(offering);
  },

  async update(id: string, input: UpdateOfferingInput): Promise<OfferingView> {
    if (input.lecturerId && !(await lecturers().getById(input.lecturerId))) {
      throw new ReferenceError("Assigned lecturer does not exist");
    }
    const offering = await prisma.offering.update({
      where: { id },
      data: {
        ...(input.term !== undefined ? { term: input.term } : {}),
        ...(input.lecturerId !== undefined ? { lecturerId: input.lecturerId } : {}),
        ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: withEnrollments,
    });
    return toView(offering);
  },

  async remove(id: string) {
    return prisma.offering.delete({ where: { id } });
  },

  async enroll(id: string, input: EnrollInput): Promise<OfferingView> {
    const offering = await prisma.offering.findUnique({ where: { id }, include: withEnrollments });
    if (!offering) throw new ReferenceError("Offering not found");

    // Validate students exist via the registry.
    const found = await students().findByIds(input.studentIds);
    if (found.length !== input.studentIds.length) {
      throw new ReferenceError("One or more students do not exist");
    }

    // Capacity check against not-yet-enrolled students.
    const already = new Set(offering.enrollments.map((e) => e.studentId));
    const toAdd = input.studentIds.filter((sid) => !already.has(sid));
    if (offering.enrollments.length + toAdd.length > offering.capacity) {
      throw new CapacityError(
        `Capacity ${offering.capacity} exceeded (${offering.enrollments.length} enrolled, adding ${toAdd.length})`,
      );
    }

    await prisma.enrollment.createMany({
      data: toAdd.map((studentId) => ({ offeringId: id, studentId })),
      skipDuplicates: true,
    });
    return (await this.getById(id))!;
  },

  async unenroll(id: string, studentId: string): Promise<OfferingView> {
    await prisma.enrollment.deleteMany({ where: { offeringId: id, studentId } });
    const view = await this.getById(id);
    if (!view) throw new ReferenceError("Offering not found");
    return view;
  },
};

export type OfferingService = typeof offeringService;
