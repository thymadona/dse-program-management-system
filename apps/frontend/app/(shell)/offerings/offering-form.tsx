"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
// The Select item value can't be "" (that's reserved for "nothing selected"),
// so optional/clearable fields use these sentinels and map back to "" at the edges.
const NOT_SET = "__not_set__";
const UNASSIGNED_SENTINEL = "__unassigned__";

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
    control,
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
            <Controller
              control={control}
              name="courseId"
              render={({ field }) => (
                <Select
                  value={field.value || null}
                  onValueChange={(v) => field.onChange(v ?? "")}
                  disabled={Boolean(editing)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="— Select course —" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Term" error={errors.term?.message}>
            <Input placeholder="2025-Fall" {...register("term")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Semester (§12)">
              <Select
                value={semester === "" ? NOT_SET : semester}
                onValueChange={(v) => setSemester(v && v !== NOT_SET ? v : "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_SET}>— Not set —</SelectItem>
                  <SelectItem value="First">1st Semester</SelectItem>
                  <SelectItem value="Second">2nd Semester</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Year (§12)">
              <Select
                value={programmeYear === "" ? NOT_SET : programmeYear}
                onValueChange={(v) => setProgrammeYear(v && v !== NOT_SET ? v : "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_SET}>— Not set —</SelectItem>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Capacity" error={errors.capacity?.message}>
              <Input type="number" min={1} {...register("capacity", { valueAsNumber: true })} />
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OFFERING_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
          <Field label="Lecturer" error={errors.lecturerId?.message}>
            <Controller
              control={control}
              name="lecturerId"
              render={({ field }) => (
                <Select
                  value={field.value || UNASSIGNED_SENTINEL}
                  onValueChange={(v) => field.onChange(v === UNASSIGNED_SENTINEL ? UNASSIGNED : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_SENTINEL}>— Unassigned —</SelectItem>
                    {lecturers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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
