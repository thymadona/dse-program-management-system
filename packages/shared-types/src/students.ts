import { z } from "zod";

/**
 * Student domain schemas. Defined once here and imported by both the backend
 * (request validation + Prisma boundary) and the frontend (form validation),
 * so the wire contract stays identical on both ends.
 */

export const STUDENT_STATUSES = ["Active", "Inactive", "Pending"] as const;
export const StudentStatusSchema = z.enum(STUDENT_STATUSES);
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

/** Full student as returned by the API. */
export const StudentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  studentId: z.string().min(1),
  status: StudentStatusSchema,
  createdAt: z.string().datetime(),
});
export type Student = z.infer<typeof StudentSchema>;

/** Body for POST /api/students. */
export const CreateStudentInput = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  studentId: z.string().min(1, "Student ID is required"),
  status: StudentStatusSchema.default("Active"),
});
export type CreateStudentInput = z.infer<typeof CreateStudentInput>;

/** Body for PATCH /api/students/:id — all fields optional. */
export const UpdateStudentInput = CreateStudentInput.partial();
export type UpdateStudentInput = z.infer<typeof UpdateStudentInput>;

/** Body for PATCH /api/students/:id/status. */
export const SetStudentStatusInput = z.object({
  status: StudentStatusSchema,
});
export type SetStudentStatusInput = z.infer<typeof SetStudentStatusInput>;

/** Query params for GET /api/students. */
export const ListStudentsQuery = z.object({
  search: z.string().trim().optional(),
  activeOnly: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
});
export type ListStudentsQuery = z.infer<typeof ListStudentsQuery>;
