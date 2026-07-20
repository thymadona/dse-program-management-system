import { z } from "zod";

/**
 * Lecturers are Users with role = lecturer, surfaced read-only via the Lecturers
 * plugin. Courses and Offerings consume this through registry.get('lecturers').
 */
export const LecturerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
});
export type Lecturer = z.infer<typeof LecturerSchema>;
