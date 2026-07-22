"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { OfferingView, Student } from "@dse-pms/shared-types";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@dse-pms/ui";
import { offeringsApi } from "@/lib/offerings";
import { ApiError } from "@/lib/api";

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offering: OfferingView | null;
  students: Student[];
  /** Called with the refreshed offering after enroll/unenroll. */
  onChanged: (updated: OfferingView) => void;
}

/** Manage which students are enrolled in an offering (Students ↔ Offering link). */
export function EnrollmentDialog({
  open,
  onOpenChange,
  offering,
  students,
  onChanged,
}: EnrollmentDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrolledIds = useMemo(
    () => new Set(offering?.students.map((s) => s.id) ?? []),
    [offering],
  );
  const available = students.filter((s) => !enrolledIds.has(s.id));
  const remaining = offering ? offering.capacity - offering.enrolledCount : 0;

  if (!offering) return null;

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const enroll = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await offeringsApi.enroll(offering.id, [...selected]);
      onChanged(updated);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not enroll");
    } finally {
      setBusy(false);
    }
  };

  const unenroll = async (studentId: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await offeringsApi.unenroll(offering.id, studentId);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not unenroll");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {offering.course?.code} — {offering.term}
          </DialogTitle>
          <DialogDescription>
            {offering.enrolledCount}/{offering.capacity} enrolled · {remaining} seat
            {remaining === 1 ? "" : "s"} left
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="mb-3 rounded-lg border border-status-upcoming bg-status-upcoming-bg px-3 py-2 text-sm text-status-upcoming">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Enrolled ({offering.students.length})
            </h3>
            {offering.students.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
            ) : (
              <ul className="space-y-1">
                {offering.students.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-sm"
                  >
                    <span>
                      {s.name} <span className="text-muted-foreground">· {s.studentId}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => unenroll(s.id)}
                      disabled={busy}
                      aria-label={`Remove ${s.name}`}
                      className="text-muted-foreground hover:bg-status-live-bg hover:text-status-live"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Add students
            </h3>
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">All students are enrolled.</p>
            ) : (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                {available.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={(c) => toggle(s.id, Boolean(c))}
                    />
                    {s.name} <span className="text-muted-foreground">· {s.studentId}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button onClick={enroll} disabled={busy || selected.size === 0}>
            Enroll {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
