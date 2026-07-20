import type { StudentStatus } from "./students.ts";

/**
 * Cross-plugin service contracts. A plugin that needs another plugin's data
 * depends only on these interfaces — resolved at runtime via
 * `registry.get<Contract>(id).service` — never on the other plugin's internals.
 * This keeps plugins decoupled while staying fully type-safe.
 *
 * The `*Ref` shapes are intentionally lean (just the fields consumers need), so
 * a plugin's concrete Prisma-backed service is structurally assignable to its
 * contract without leaking createdAt/Date details across the boundary.
 */

export interface StudentRef {
  id: string;
  name: string;
  studentId: string;
  email: string;
  status: StudentStatus;
}

export interface CourseRef {
  id: string;
  code: string;
  title: string;
  lecturerId: string | null;
}

export interface LecturerRef {
  id: string;
  name: string;
  email: string;
}

export interface StudentsServiceContract {
  getById(id: string): Promise<StudentRef | null>;
  findByIds(ids: string[]): Promise<StudentRef[]>;
}

export interface CoursesServiceContract {
  getById(id: string): Promise<CourseRef | null>;
}

export interface LecturersServiceContract {
  list(): Promise<LecturerRef[]>;
  getById(id: string): Promise<LecturerRef | null>;
}
