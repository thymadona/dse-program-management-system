"use client";

import {
  COURSE_TYPES,
  PROGRAMME_TITLE,
  SEMESTERS,
  courseTypeLabel,
  semesterLabel,
} from "@dse-pms/shared-types";
import { Input } from "@dse-pms/ui";

/** All fields held as strings for input binding; converted on save by the wizard. */
export type CourseInfoForm = {
  courseTitle: string;
  courseCode: string;
  credits: string;
  prerequisites: string;
  courseType: string;
  description: string;
  instructorName: string;
  qualification: string;
  email: string;
  telephone: string;
  otherLecturers: string;
  semester: string;
  programmeYear: string;
};

export const EMPTY_COURSE_INFO: CourseInfoForm = {
  courseTitle: "",
  courseCode: "",
  credits: "",
  prerequisites: "",
  courseType: "",
  description: "",
  instructorName: "",
  qualification: "",
  email: "",
  telephone: "",
  otherLecturers: "",
  semester: "",
  programmeYear: "",
};

/** Map the API's Course Information snapshot into the string-based form model. */
export function toCourseInfoForm(data: Record<string, unknown> | undefined): CourseInfoForm {
  const d = (data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (v == null ? "" : String(v));
  return {
    courseTitle: str(d.courseTitle),
    courseCode: str(d.courseCode),
    credits: str(d.credits),
    prerequisites: str(d.prerequisites),
    courseType: str(d.courseType),
    description: str(d.description),
    instructorName: str(d.instructorName),
    qualification: str(d.qualification),
    email: str(d.email),
    telephone: str(d.telephone),
    otherLecturers: str(d.otherLecturers),
    semester: str(d.semester),
    programmeYear: str(d.programmeYear),
  };
}

/** Convert the form model into the CourseInfoSection payload the API validates. */
export function toCourseInfoPayload(f: CourseInfoForm) {
  const trimmed = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    courseTitle: f.courseTitle.trim(),
    courseCode: f.courseCode.trim(),
    credits: f.credits ? Number(f.credits) : null,
    prerequisites: trimmed(f.prerequisites),
    courseType: f.courseType || null,
    description: trimmed(f.description),
    instructorName: trimmed(f.instructorName),
    qualification: trimmed(f.qualification),
    email: trimmed(f.email),
    telephone: trimmed(f.telephone),
    otherLecturers: trimmed(f.otherLecturers),
    semester: f.semester || null,
    programmeYear: f.programmeYear ? Number(f.programmeYear) : null,
  };
}

export function CourseInfoSection({
  value,
  onChange,
}: {
  value: CourseInfoForm;
  onChange: (patch: Partial<CourseInfoForm>) => void;
}) {
  const set = (patch: Partial<CourseInfoForm>) => onChange(patch);

  return (
    <div className="space-y-5">
      <Field label="1. Programme Title">
        <Input value={PROGRAMME_TITLE} disabled readOnly />
        <p className="mt-1 text-xs text-muted-foreground">
          Fixed for this programme — filled automatically.
        </p>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="2. Course Title">
          <Input
            placeholder="Predictive Analytics"
            value={value.courseTitle}
            onChange={(e) => set({ courseTitle: e.target.value })}
          />
        </Field>
        <Field label="3. Course Code">
          <Input
            placeholder="PAN202"
            value={value.courseCode}
            onChange={(e) => set({ courseCode: e.target.value })}
          />
        </Field>
        <Field label="4. No. of Credits">
          <Input
            type="number"
            min={1}
            max={30}
            placeholder="3"
            value={value.credits}
            onChange={(e) => set({ credits: e.target.value })}
          />
        </Field>
        <Field label="11. Course Type">
          <Select value={value.courseType} onChange={(v) => set({ courseType: v })}>
            <option value="">— Not set —</option>
            {COURSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {courseTypeLabel(t)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="5. Pre-requisites (if any)">
        <Input
          placeholder="e.g. Math I–III; Statistics I–II; Advanced Programming"
          value={value.prerequisites}
          onChange={(e) => set({ prerequisites: e.target.value })}
        />
      </Field>

      <fieldset className="space-y-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">
          Course Instructor (§6–9)
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="6. Course Instructor">
            <Input
              placeholder="Chim Seyha"
              value={value.instructorName}
              onChange={(e) => set({ instructorName: e.target.value })}
            />
          </Field>
          <Field label="7. Qualification">
            <Input
              placeholder="Master's degree in computer science"
              value={value.qualification}
              onChange={(e) => set({ qualification: e.target.value })}
            />
          </Field>
          <Field label="8. Email">
            <Input
              type="email"
              placeholder="chim.seyha@rupp.edu.kh"
              value={value.email}
              onChange={(e) => set({ email: e.target.value })}
            />
          </Field>
          <Field label="9. Telephone No.">
            <Input
              placeholder="096 5321 532"
              value={value.telephone}
              onChange={(e) => set({ telephone: e.target.value })}
            />
          </Field>
        </div>
      </fieldset>

      <Field label="10. Other Course Lecturer(s) (if any)">
        <Input
          placeholder="Co-teachers, comma separated (optional)"
          value={value.otherLecturers}
          onChange={(e) => set({ otherLecturers: e.target.value })}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="12. Course Availability — Semester">
          <Select value={value.semester} onChange={(v) => set({ semester: v })}>
            <option value="">— Not set —</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                {semesterLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="12. Course Availability — Year">
          <Select value={value.programmeYear} onChange={(v) => set({ programmeYear: v })}>
            <option value="">— Not set —</option>
            {[1, 2, 3, 4].map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="13. Course Description / Synopsis">
        <textarea
          className="min-h-[140px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          placeholder="Short synopsis of the course — what it covers, tools used, and what students can do by the end."
          value={value.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}
