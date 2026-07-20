"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateCourseInput, type Lecturer } from "@dse-pms/shared-types";
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
    defaultValues: { code: "", title: "", description: "", lecturerId: UNASSIGNED },
  });

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              code: editing.code,
              title: editing.title,
              description: editing.description ?? "",
              lecturerId: editing.lecturerId ?? UNASSIGNED,
            }
          : { code: "", title: "", description: "", lecturerId: UNASSIGNED },
      );
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
            // Normalise "" (Unassigned) to null for the API.
            await onSubmit({ ...values, lecturerId: values.lecturerId || null });
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
