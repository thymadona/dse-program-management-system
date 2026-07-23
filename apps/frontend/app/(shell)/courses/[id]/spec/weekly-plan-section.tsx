"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@dse-pms/ui";
import type { CloForm } from "./clos-section";
import {
  cloChip,
  weekSltForm,
  weeklyPlanFormTotals,
  type WeekForm,
  type WeeklyPlanForm,
} from "./weekly-plan-model";
import { AddWeekDialog } from "./add-week-dialog";

// Re-exported so the wizard keeps importing the weekly-plan model from this section.
export {
  EMPTY_WEEKLY_PLAN,
  toWeeklyPlanForm,
  toWeeklyPlanPayload,
  type WeeklyPlanForm,
} from "./weekly-plan-model";

export function WeeklyPlanSectionForm({
  value,
  onChange,
  clos,
  courseName,
}: {
  value: WeeklyPlanForm;
  onChange: (v: WeeklyPlanForm) => void;
  clos: CloForm[];
  courseName?: string;
}) {
  // Dialog state: editing a specific id, adding (null), or closed.
  const [editing, setEditing] = useState<{ id: string | null } | null>(null);

  const totals = weeklyPlanFormTotals(value);
  const existingAssessments = useMemo(
    () => [...new Set(value.map((w) => w.assessment.trim()).filter(Boolean))],
    [value],
  );
  const editingWeek = editing?.id ? value.find((w) => w.id === editing.id) ?? null : null;

  const upsert = (draft: WeekForm) => {
    const exists = value.some((w) => w.id === draft.id);
    const next = exists
      ? value.map((w) => (w.id === draft.id ? draft : w))
      : [...value, draft];
    next.sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0));
    onChange(next);
    setEditing(null);
  };

  const remove = (id: string) => {
    const w = value.find((x) => x.id === id);
    if (typeof window !== "undefined" && !window.confirm(`Delete week ${w?.week}? This can't be undone.`)) {
      return;
    }
    onChange(value.filter((x) => x.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Weekly Plan</h2>
          <p className="text-sm text-muted-foreground">
            Plan weekly topics, learning activities, SLT and link to CLOs
            {courseName ? ` for ${courseName}` : ""}.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing({ id: null })}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Week
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Weekly Plan ({value.length} {value.length === 1 ? "Week" : "Weeks"})
        </h3>
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <p className="text-sm text-muted-foreground">No weeks planned yet.</p>
          <button
            type="button"
            onClick={() => setEditing({ id: null })}
            className="mt-1 text-sm font-medium text-accent-foreground hover:underline"
          >
            + Add your first week
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[920px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                <th className="w-14 px-3 py-2.5">Week</th>
                <th className="px-3 py-2.5">Topic / Content</th>
                <th className="px-3 py-2.5">CLOs</th>
                <th className="px-3 py-2.5">Learning Activities</th>
                <th className="px-3 py-2.5 text-center">Contact Hours (L+T)</th>
                <th className="px-3 py-2.5 text-center">Self-Study Hours</th>
                <th className="px-3 py-2.5 text-center">SLT (Hours)</th>
                <th className="px-3 py-2.5">Assessment / Deliverables</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {value.map((w) => (
                <tr key={w.id} className="border-b border-border/70 align-top">
                  <td className="px-3 py-3">
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
                      {w.week || "—"}
                    </span>
                  </td>
                  <td className="max-w-[240px] px-3 py-3 font-medium text-foreground">
                    {w.topic || <span className="text-muted-foreground">Untitled</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {w.cloCodes.length ? (
                        w.cloCodes.map((code) => (
                          <span
                            key={code}
                            className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${cloChip(code)}`}
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[200px] px-3 py-3">
                    {w.activities.length ? (
                      <ul className="space-y-0.5">
                        {w.activities.map((a) => (
                          <li key={a} className="flex items-center gap-1.5 text-foreground">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-foreground">{w.contactHours || "—"}</td>
                  <td className="px-3 py-3 text-center text-foreground">{w.selfStudyHours || "—"}</td>
                  <td className="px-3 py-3 text-center font-medium text-foreground">{weekSltForm(w)}</td>
                  <td className="px-3 py-3 text-foreground">
                    {w.assessment || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton label={`Edit week ${w.week}`} onClick={() => setEditing({ id: w.id })}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label={`Delete week ${w.week}`} danger onClick={() => remove(w.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/40 text-sm font-semibold text-foreground">
                <td colSpan={4} className="px-3 py-2.5">
                  Total ({value.length} {value.length === 1 ? "Week" : "Weeks"})
                </td>
                <td className="px-3 py-2.5 text-center">{totals.contactHours}</td>
                <td className="px-3 py-2.5 text-center">{totals.selfStudyHours}</td>
                <td className="px-3 py-2.5 text-center">{totals.slt}</td>
                <td colSpan={2} className="px-3 py-2.5" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        SLT = Contact Hours (Lecture + Tutorial) + Self-Study Hours
      </div>

      <AddWeekDialog
        open={editing != null}
        week={editingWeek}
        weeks={value}
        clos={clos}
        existingAssessments={existingAssessments}
        onCancel={() => setEditing(null)}
        onSave={upsert}
      />
    </div>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted ${
        danger ? "text-status-live hover:border-status-live/40" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
