"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  COURSE_TYPES,
  CreateCourseInput,
  courseTypeLabel,
  type CourseType,
  type Lecturer,
} from "@dse-pms/shared-types";
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
import type { CourseView } from "@/lib/courses";

export type CourseFormValues = {
  code: string;
  title: string;
  description?: string;
  lecturerId?: string | null;
  // Syllabus Course Information — §4 credits, §5 prerequisites, §11 type.
  credits?: number | null;
  prerequisites?: string;
  courseType?: CourseType | null;
  totalSltHours?: number | null;
};

interface CourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: CourseView | null;
  lecturers: Lecturer[];
  onSubmit: (values: CourseFormValues) => Promise<void>;
  submitting?: boolean;
}

const UNASSIGNED = "";

export function CourseForm({
  open,
  onOpenChange,
  editing,
  lecturers,
  onSubmit,
  submitting,
}: CourseFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(CreateCourseInput),
    defaultValues: { code: "", title: "", description: "", lecturerId: UNASSIGNED, prerequisites: "" },
  });

  // Credits (§4) and course type (§11) live in local state so an empty choice
  // submits as null rather than tripping the shared input resolver.
  const [credits, setCredits] = useState<string>("");
  const [courseType, setCourseType] = useState<string>("");
  const [totalSltHours, setTotalSltHours] = useState<string>("");

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              code: editing.code,
              title: editing.title,
              description: editing.description ?? "",
              lecturerId: editing.lecturerId ?? UNASSIGNED,
              prerequisites: editing.prerequisites ?? "",
            }
          : { code: "", title: "", description: "", lecturerId: UNASSIGNED, prerequisites: "" },
      );
      setCredits(editing?.credits != null ? String(editing.credits) : "");
      setCourseType(editing?.courseType ?? "");
      setTotalSltHours(editing?.totalSltHours != null ? String(editing.totalSltHours) : "");
    }
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit course" : "Add course"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update course details and assigned lecturer." : "Create a new course."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (values) => {
            // Normalise "" (Unassigned / not set) to null for the API.
            await onSubmit({
              ...values,
              lecturerId: values.lecturerId || null,
              prerequisites: values.prerequisites?.trim() || undefined,
              credits: credits ? Number(credits) : null,
              courseType: (courseType || null) as CourseType | null,
              totalSltHours: totalSltHours ? Number(totalSltHours) : null,
            });
          })}
          className="space-y-4"
        >
          <Field label="Code" error={errors.code?.message}>
            <Input placeholder="CS101" {...register("code")} />
          </Field>
          <Field label="Title" error={errors.title?.message}>
            <Input placeholder="Introduction to Programming" {...register("title")} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <Input placeholder="Optional" {...register("description")} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Credits (§4)">
              <Input
                type="number"
                min={1}
                max={30}
                placeholder="3"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
              />
            </Field>
            <Field label="Total SLT (hours)">
              <Input
                type="number"
                min={0}
                placeholder="120"
                value={totalSltHours}
                onChange={(e) => setTotalSltHours(e.target.value)}
              />
            </Field>
            <Field label="Course type (§11)">
              <select
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                value={courseType}
                onChange={(e) => setCourseType(e.target.value)}
              >
                <option value="">— Not set —</option>
                {COURSE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {courseTypeLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Pre-requisites (§5)" error={errors.prerequisites?.message}>
            <Input
              placeholder="e.g. Math I–III; Statistics I–II (optional)"
              {...register("prerequisites")}
            />
          </Field>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add course"}
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
