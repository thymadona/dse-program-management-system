"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateLecturerInput, type Lecturer } from "@dse-pms/shared-types";
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

export type LecturerFormValues = {
  name: string;
  email: string;
  title?: string;
  qualification?: string;
  phone?: string;
};

interface LecturerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Lecturer | null;
  onSubmit: (values: LecturerFormValues) => Promise<void>;
  submitting?: boolean;
}

const empty: LecturerFormValues = { name: "", email: "", title: "", qualification: "", phone: "" };

export function LecturerForm({ open, onOpenChange, editing, onSubmit, submitting }: LecturerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LecturerFormValues>({
    resolver: zodResolver(CreateLecturerInput),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) {
      reset(
        editing
          ? {
              name: editing.name,
              email: editing.email,
              title: editing.title ?? "",
              qualification: editing.qualification ?? "",
              phone: editing.phone ?? "",
            }
          : empty,
      );
    }
  }, [open, editing, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit lecturer" : "Add lecturer"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the lecturer's details. Qualification and phone appear on course syllabi."
              : "Add a new lecturer (a User with the lecturer role)."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(async (values) => {
            // Send undefined for blank optionals so they store as null, not "".
            await onSubmit({
              ...values,
              title: values.title || undefined,
              qualification: values.qualification || undefined,
              phone: values.phone || undefined,
            });
          })}
          className="space-y-4"
        >
          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="Chim Seyha" {...register("name")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input placeholder="chim.seyha@rupp.edu.kh" {...register("email")} />
          </Field>
          <Field label="Title" error={errors.title?.message}>
            <Input placeholder="Mr. / Ms. / Dr. / Assoc. Prof. (optional)" {...register("title")} />
          </Field>
          <Field label="Qualification" error={errors.qualification?.message}>
            <Input placeholder="Master's degree in computer science (optional)" {...register("qualification")} />
          </Field>
          <Field label="Telephone" error={errors.phone?.message}>
            <Input placeholder="096 5321 532 (optional)" {...register("phone")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : editing ? "Save changes" : "Add lecturer"}
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
