import { z } from "zod";

/**
 * Course Offering schemas. An offering is a course delivered in a term with an
 * assigned lecturer, a seat capacity, and enrolled students. The offerings
 * service resolves course/lecturer/student references through the registry.
 */
export const OFFERING_STATUSES = ["Planned", "Active", "Completed"] as const;
export const OfferingStatusSchema = z.enum(OFFERING_STATUSES);
export type OfferingStatus = z.infer<typeof OfferingStatusSchema>;

export const CreateOfferingInput = z.object({
  courseId: z.string().uuid("A course is required"),
  term: z.string().min(1, "Term is required"),
  lecturerId: z.string().uuid().nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(1000).default(30),
  status: OfferingStatusSchema.default("Planned"),
});
export type CreateOfferingInput = z.infer<typeof CreateOfferingInput>;

export const UpdateOfferingInput = CreateOfferingInput.partial().omit({ courseId: true });
export type UpdateOfferingInput = z.infer<typeof UpdateOfferingInput>;

export const ListOfferingsQuery = z.object({
  term: z.string().trim().optional(),
  status: OfferingStatusSchema.optional(),
});
export type ListOfferingsQuery = z.infer<typeof ListOfferingsQuery>;

/** Body for POST /api/offerings/:id/enrollments */
export const EnrollInput = z.object({
  studentIds: z.array(z.string().uuid()).min(1, "Select at least one student"),
});
export type EnrollInput = z.infer<typeof EnrollInput>;

/** Enriched offering as returned by the API (joined via the registry). */
export interface OfferingView {
  id: string;
  term: string;
  status: OfferingStatus;
  capacity: number;
  enrolledCount: number;
  createdAt: string;
  course: { id: string; code: string; title: string } | null;
  lecturer: { id: string; name: string; email: string } | null;
  students: { id: string; name: string; studentId: string }[];
}
