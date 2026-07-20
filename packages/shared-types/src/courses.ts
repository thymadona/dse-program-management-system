import { z } from "zod";

/**
 * Course domain schemas. `lecturerId` is validated at the service layer through
 * registry.get('lecturers') — never by importing the lecturers plugin directly.
 */
export const CourseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  lecturerId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type Course = z.infer<typeof CourseSchema>;

export const CreateCourseInput = z.object({
  code: z.string().min(1, "Course code is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  lecturerId: z.string().uuid().nullable().optional(),
});
export type CreateCourseInput = z.infer<typeof CreateCourseInput>;

export const UpdateCourseInput = CreateCourseInput.partial();
export type UpdateCourseInput = z.infer<typeof UpdateCourseInput>;

export const ListCoursesQuery = z.object({
  search: z.string().trim().optional(),
});
export type ListCoursesQuery = z.infer<typeof ListCoursesQuery>;
