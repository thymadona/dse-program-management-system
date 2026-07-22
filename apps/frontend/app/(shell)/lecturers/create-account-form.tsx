"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateAccountInput } from "@dse-pms/shared-types";
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

export type CreateAccountValues = { name: string; email: string };

interface CreateAccountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateAccountValues) => Promise<void>;
  submitting?: boolean;
}

const empty: CreateAccountValues = { name: "", email: "" };

/**
 * Admin-only: provision a lecturer *login account*. Distinct from "Add Lecturer"
 * (which creates a profile only) — this sends a Supabase invite so the lecturer
 * sets their own password and can sign in.
 */
export function CreateAccountForm({ open, onOpenChange, onSubmit, submitting }: CreateAccountFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAccountValues>({
    // role defaults to "lecturer" server-side; the form only collects name + email.
    resolver: zodResolver(CreateAccountInput.pick({ name: true, email: true })),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) reset(empty);
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create login account</DialogTitle>
          <DialogDescription>
            Sends an invite email so the lecturer can set a password and sign in. Creates or links
            their lecturer profile automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message}>
            <Input placeholder="Chim Seyha" {...register("name")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input placeholder="chim.seyha@rupp.edu.kh" {...register("email")} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Inviting…" : "Send invite"}
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
