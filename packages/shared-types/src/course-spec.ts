import { z } from "zod";
import { CourseTypeSchema } from "./courses.ts";
import { SemesterSchema } from "./offerings.ts";

/**
 * Course Specification wizard contract. The full RUPP syllabus (Part 2 §1–25) is
 * captured as one JSON document per course. This module defines:
 *  - the ordered SECTION registry that drives the wizard stepper,
 *  - reference constants (Bloom-style level guides, legends) for the inline guides
 *    and dropdowns, and
 *  - per-section input schemas (Phase 1: Course Information §1–13).
 *
 * Storage lives in the CourseSpec table: `data[sectionId]` holds a section's content,
 * `status[sectionId]` tracks draft/complete so a lecturer can save and resume.
 */

/* ------------------------------------------------------------------ sections */

/** Whether a wizard section is implemented yet or a placeholder for a later phase. */
export type SpecSectionState = "ready" | "soon";

export interface SpecSectionMeta {
  /** Stable key used in CourseSpec.data / .status and the route hash. */
  id: string;
  /** Step label in the stepper. */
  title: string;
  /** Syllabus reference shown as a subtitle, e.g. "§1–13". */
  ref?: string;
  /** "Part 1" (programme, read-only) or "Part 2" (course). */
  part: "Part 1" | "Part 2";
  state: SpecSectionState;
}

/** Ordered wizard steps. Part 1 is a read-only programme reference; Part 2 is §1–25. */
export const SPEC_SECTIONS: readonly SpecSectionMeta[] = [
  { id: "programme", title: "Programme", ref: "Part 1", part: "Part 1", state: "ready" },
  { id: "courseInfo", title: "Course Information", ref: "§1–13", part: "Part 2", state: "ready" },
  { id: "clos", title: "Course Learning Outcomes", ref: "§14", part: "Part 2", state: "soon" },
  { id: "cloMapping", title: "CLO → PLO Mapping & Methods", ref: "§15", part: "Part 2", state: "soon" },
  { id: "slt", title: "Student Learning Time", ref: "§16", part: "Part 2", state: "soon" },
  { id: "assessmentPlan", title: "Course Assessment Plan", ref: "§17", part: "Part 2", state: "soon" },
  { id: "lessonPlan", title: "Course Outline & Lesson Plan", ref: "§18", part: "Part 2", state: "soon" },
  { id: "resources", title: "Required Resources", ref: "§19", part: "Part 2", state: "soon" },
  { id: "references", title: "References / Textbooks", ref: "§20", part: "Part 2", state: "soon" },
  { id: "responsibility", title: "Student Responsibility", ref: "§21", part: "Part 2", state: "soon" },
  { id: "rubric", title: "Rubric & Rating Scale", ref: "§22", part: "Part 2", state: "soon" },
  { id: "policy", title: "Course Policy", ref: "§23", part: "Part 2", state: "soon" },
  { id: "ratingScale", title: "Rating Scale", ref: "§24", part: "Part 2", state: "soon" },
  { id: "date", title: "Date", ref: "§25", part: "Part 2", state: "soon" },
] as const;

export type SpecSectionId = (typeof SPEC_SECTIONS)[number]["id"];

/** Per-section completion tracking stored in CourseSpec.status. */
export const SpecSectionStatus = z.enum(["draft", "complete"]);
export type SpecSectionStatus = z.infer<typeof SpecSectionStatus>;

/* ------------------------------------------------------- reference constants */

/** A Bloom-style level: code (e.g. "C3"), short name, and ordinal. */
export interface LevelGuideEntry {
  code: string;
  name: string;
}

/** §14 Cognitive domain (C1–C6). */
export const COGNITIVE_LEVELS: readonly LevelGuideEntry[] = [
  { code: "C1", name: "Remembering" },
  { code: "C2", name: "Understanding" },
  { code: "C3", name: "Applying" },
  { code: "C4", name: "Analyzing" },
  { code: "C5", name: "Evaluating" },
  { code: "C6", name: "Creating" },
] as const;

/** §14 Affective domain (A1–A5). */
export const AFFECTIVE_LEVELS: readonly LevelGuideEntry[] = [
  { code: "A1", name: "Receiving" },
  { code: "A2", name: "Responding" },
  { code: "A3", name: "Valuing" },
  { code: "A4", name: "Organizing" },
  { code: "A5", name: "Internalizing" },
] as const;

/** §14 Psychomotor domain (P1–P7). */
export const PSYCHOMOTOR_LEVELS: readonly LevelGuideEntry[] = [
  { code: "P1", name: "Perception" },
  { code: "P2", name: "Set" },
  { code: "P3", name: "Guided Response" },
  { code: "P4", name: "Mechanism" },
  { code: "P5", name: "Complex Overt Response" },
  { code: "P6", name: "Adaptation" },
  { code: "P7", name: "Origination" },
] as const;

/** §15 focus of a CLO on a PLO relative to total SLT. */
export const FOCUS_LEVELS: readonly { code: string; name: string; hint: string }[] = [
  { code: "F", name: "Fully", hint: "more than 50% of total SLT" },
  { code: "M", name: "Moderate", hint: "31%–50% of total SLT" },
  { code: "P", name: "Partial", hint: "less than 30% of total SLT" },
] as const;

/** §16 learning & teaching activity types. */
export const SLT_ACTIVITIES: readonly { code: string; name: string }[] = [
  { code: "L", name: "Lecture" },
  { code: "T", name: "Tutoring" },
  { code: "P", name: "Practice" },
  { code: "O", name: "Other" },
] as const;

/** §17 assessment grouping. */
export const GROUP_INDIVIDUAL: readonly { code: string; name: string }[] = [
  { code: "I", name: "Individual" },
  { code: "G", name: "Group" },
] as const;

/** §24 letter-grade rating scale (fixed programme standard). */
export const LETTER_GRADES: readonly { grade: string; point: string; score: string; label: string }[] = [
  { grade: "A", point: "4.00", score: "85–100", label: "Excellent" },
  { grade: "B+", point: "3.50", score: "80–84", label: "Very Good" },
  { grade: "B", point: "3.00", score: "75–79", label: "Good" },
  { grade: "C+", point: "2.50", score: "70–74", label: "Fairly Good" },
  { grade: "C", point: "2.00", score: "65–69", label: "Fair" },
  { grade: "D+", point: "1.50", score: "60–64", label: "Poor" },
  { grade: "D", point: "1.00", score: "50–59", label: "Very Poor" },
  { grade: "F", point: "0.00", score: "<50", label: "Fail" },
] as const;

/* -------------------------------------------- §1–13 Course Information */

/**
 * Course Information (§1–13). Programme Title (§1) is fixed config and not stored
 * here. Instructor block (§6–9) is captured as a snapshot on the spec (a lecturer
 * fills the form as a document); the overlapping course scalars (§2–5, §11, §13)
 * are mirrored back onto the Course row on save.
 */
export const CourseInfoSection = z.object({
  // §2 / §3 / §4 / §5 / §11 / §13 — mirrored to Course.
  courseTitle: z.string().min(1, "Course title is required"),
  courseCode: z.string().min(1, "Course code is required"),
  credits: z.coerce.number().int().min(1).max(30).nullable().optional(),
  prerequisites: z.string().optional(),
  courseType: CourseTypeSchema.nullable().optional(),
  description: z.string().optional(),
  // §6–9 instructor snapshot.
  instructorName: z.string().optional(),
  qualification: z.string().optional(),
  email: z.string().email("A valid email is required").or(z.literal("")).optional(),
  telephone: z.string().optional(),
  // §10 other lecturers (free text).
  otherLecturers: z.string().optional(),
  // §12 availability.
  semester: SemesterSchema.nullable().optional(),
  programmeYear: z.coerce.number().int().min(1).max(10).nullable().optional(),
});
export type CourseInfoSection = z.infer<typeof CourseInfoSection>;

/** Zod schema for a given section id. Extend as later phases add sections. */
export const SPEC_SECTION_SCHEMAS: Partial<Record<SpecSectionId, z.ZodTypeAny>> = {
  courseInfo: CourseInfoSection,
};

/* ------------------------------------------------------------- spec envelope */

/** Full spec as returned by the API: opaque per-section data + status map. */
export const CourseSpecSchema = z.object({
  courseId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  status: z.record(z.string(), SpecSectionStatus),
});
export type CourseSpecView = z.infer<typeof CourseSpecSchema>;
