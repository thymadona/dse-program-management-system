"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateOfferingInput,
  OFFERING_STATUSES,
  type Lecturer,
  type OfferingView,
  type Semester,
} from "@dse-pms/shared-types";
import type { CourseView } from "@/lib/courses";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@dse-pms/ui";

export type OfferingFormValues = {
  courseId: string;
  term: string;
  lecturerId?: string | null;
  capacity: number;
  status: (typeof OFFERING_STATUSES)[number];
  // §12 Course Availability — optional.
  semester?: Semester | null;
  programmeYear?: number | null;
  // §10 Other Course Lecturer(s) — optional free text.
  otherLecturers?: string;
};

const YEAR_OPTIONS = [1, 2, 3, 4] as const;

interface OfferingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: OfferingView | null;
  courses: CourseView[];
  lecturers: Lecturer[];
  onSubmit: (values: OfferingFormValues) => Promise<void>;
  submitting?: boolean;
}

const UNASSIGNED = "";

export function OfferingForm({
  open,
  onOpenChange,
  editing,
  courses,
  lecturers,
  onSubmit,
  submitting,
}: OfferingFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferingFormValues>({
    resolver: zodResolver(CreateOfferingInput),
    defaultValues: {
      courseId: "",
      term: "",
      lecturerId: UNASSIGNED,
      capacity: 30,
      status: "Planned",
      otherLecturers: "",
    },
  });

  // §12 Course Availability is kept in local state (plain selects) so an empty
  // choice submits as null rather than tripping the shared input resolver.
  const [semester, setSemester] = useState<string>("");
  const [programmeYear, setProgrammeYear] = useState<string>("");

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              courseId: editing.course?.id ?? "",
              term: editing.term,
              lecturerId: editing.lecturer?.id ?? UNASSIGNED,
              capacity: editing.capacity,
              status: editing.status,
              otherLecturers: editing.otherLecturers ?? "",
            }
          : {
              courseId: "",
              term: "",
              lecturerId: UNASSIGNED,
              capacity: 30,
              status: "Planned",
              otherLecturers: "",
            },
      );
      setSemester(editing?.semester ?? "");
      setProgrammeYear(editing?.programmeYear != null ? String(editing.programmeYear) : "");
    }
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit offering" : "Add offering"}</DialogTitle>
          <DialogDescription>
            A course delivered in a term, with a lecturer and seat capacity.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (values) => {
            await onSubmit({
              ...values,
              lecturerId: values.lecturerId || null,
              semester: (semester || null) as Semester | null,
              programmeYear: programmeYear ? Number(programmeYear) : null,
              otherLecturers: values.otherLecturers?.trim() || undefined,
            });
          })}
          className="space-y-4"
        >
          <Field label="Course" error={errors.courseId?.message}>
            <select
              className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              disabled={Boolean(editing)}
              {...register("courseId")}
            >
              <option value="">— Select course —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term" error={errors.term?.message}>
            <Input placeholder="2025-Fall" {...register("term")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Semester (§12)">
              <select
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              >
                <option value="">— Not set —</option>
                <option value="First">1st Semester</option>
                <option value="Second">2nd Semester</option>
              </select>
            </Field>
            <Field label="Year (§12)">
              <select
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={programmeYear}
                onChange={(e) => setProgrammeYear(e.target.value)}
              >
                <option value="">— Not set —</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity" error={errors.capacity?.message}>
              <Input type="number" min={1} {...register("capacity", { valueAsNumber: true })} />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <select
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                {...register("status")}
              >
                {OFFERING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Lecturer" error={errors.lecturerId?.message}>
            <select
              className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              {...register("lecturerId")}
            >
              <option value={UNASSIGNED}>— Unassigned —</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Other lecturer(s) (§10)" error={errors.otherLecturers?.message}>
            <Input placeholder="Co-teachers this term (optional)" {...register("otherLecturers")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add offering"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {error ? <span className="block text-xs text-status-live">{error}</span> : null}
    </label>
  );
}
