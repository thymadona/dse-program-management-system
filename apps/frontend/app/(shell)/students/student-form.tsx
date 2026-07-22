"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateStudentInput,
  STUDENT_STATUSES,
  type Student,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dse-pms/ui";

export interface StudentFormValues extends CreateStudentInput {}

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the form edits this student; otherwise it creates a new one. */
  editing?: Student | null;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  submitting?: boolean;
}

/** Add/Edit dialog backed by react-hook-form + the shared Zod schema. */
export function StudentForm({
  open,
  onOpenChange,
  editing,
  onSubmit,
  submitting,
}: StudentFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(CreateStudentInput),
    defaultValues: { name: "", email: "", studentId: "", status: "Active" },
  });

  // Sync form values whenever the dialog opens or the editing target changes.
  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              name: editing.name,
              email: editing.email,
              studentId: editing.studentId,
              status: editing.status,
            }
          : { name: "", email: "", studentId: "", status: "Active" },
      );
    }
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update the student's details." : "Create a new student record."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (values) => {
            await onSubmit(values);
          })}
          className="space-y-4"
        >
          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="Jane Doe" {...register("name")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="jane@dse.dev" {...register("email")} />
          </Field>
          <Field label="Student ID" error={errors.studentId?.message}>
            <Input placeholder="DSE-0006" {...register("studentId")} />
          </Field>
          <Field label="Status" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add student"}
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
