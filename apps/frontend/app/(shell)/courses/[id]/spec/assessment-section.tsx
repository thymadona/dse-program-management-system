"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Copy, Info, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@dse-pms/ui";
import { assessmentTotalWeight, assessmentTypeChip, type AssessmentForm } from "./assessment-model";
import { cloChip } from "./weekly-plan-model";

// Re-exported so the wizard keeps importing the assessment model from this section.
export {
  EMPTY_ASSESSMENTS,
  toAssessmentForm,
  toAssessmentPayload,
  type AssessmentForm,
} from "./assessment-model";

export function AssessmentSection({
  value,
  courseId,
  onPersist,
}: {
  value: AssessmentForm[];
  courseId: string;
  /** Persist the given assessment list (whole §17 section) and sync wizard state. */
  onPersist: (items: AssessmentForm[]) => Promise<boolean>;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  const total = assessmentTotalWeight(value);
  const totalOk = value.length === 0 || Math.round(total) === 100;

  const openAdd = () => router.push(`/courses/${courseId}/spec/assessment/add`);
  const openEdit = (id: string) => router.push(`/courses/${courseId}/spec/assessment/${id}/edit`);
  const openRubrics = () => router.push(`/courses/${courseId}/spec/assessment/rubrics`);

  const duplicate = (index: number) => {
    const src = value[index];
    if (!src) return;
    const copy: AssessmentForm = {
      ...src,
      id: globalThis.crypto.randomUUID(),
      name: `${src.name} (copy)`,
    };
    onPersist([...value.slice(0, index + 1), copy, ...value.slice(index + 1)]);
  };

  const remove = (index: number) => {
    const src = value[index];
    if (typeof window !== "undefined" && !window.confirm(`Delete "${src?.name}"? This can't be undone.`)) {
      return;
    }
    onPersist(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Assessment</h2>
          <p className="text-sm text-muted-foreground">
            Define assessments, link to CLOs, set weightings and plan assessment schedule.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openRubrics}>
            <ClipboardList className="mr-1.5 h-4 w-4" /> Rubric Library
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Assessment
          </Button>
        </div>
      </div>

      {notice ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-medium hover:text-foreground">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Table */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Assessment Plan</h3>
        </div>

        {value.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">No assessments yet.</p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-1 text-sm font-medium text-accent-foreground hover:underline"
            >
              + Add your first assessment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="w-8 py-2 pr-2">#</th>
                  <th className="py-2 pr-3">Assessment Name</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Linked CLOs</th>
                  <th className="py-2 pr-3 text-center">Weight (%)</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {value.map((a, index) => (
                  <tr key={a.id} className="border-b border-border/70 align-top">
                    <td className="py-3 pr-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => openEdit(a.id)}
                        className="text-left font-medium text-accent-foreground hover:underline"
                      >
                        {a.name || "Untitled"}
                      </button>
                      {a.status === "inactive" ? (
                        <span className="ml-2 text-xs text-muted-foreground">(inactive)</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${assessmentTypeChip(a.type)}`}
                      >
                        {a.type}
                      </span>
                    </td>
                    <td className="max-w-[240px] py-3 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {a.cloCodes.length ? (
                          a.cloCodes.map((code) => (
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
                    <td className="py-3 pr-3 text-center text-foreground">
                      {a.weight === "" ? <span className="text-muted-foreground">—</span> : `${a.weight}%`}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label={`Edit ${a.name}`} onClick={() => openEdit(a.id)}>
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Duplicate ${a.name}`} onClick={() => duplicate(index)}>
                          <Copy className="h-4 w-4" />
                        </IconButton>
                        <IconButton label={`Delete ${a.name}`} danger onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border text-sm font-semibold text-foreground">
                  <td colSpan={4} className="py-2.5 pr-3">
                    Total
                  </td>
                  <td className={`py-2.5 pr-3 text-center ${totalOk ? "text-foreground" : "text-status-live"}`}>
                    {Math.round(total * 100) / 100}%
                  </td>
                  <td className="py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {value.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing 1 to {value.length} of {value.length} assessment{value.length === 1 ? "" : "s"}
            </p>
            <div
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                totalOk
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-status-live/40 bg-status-live/10 text-status-live"
              }`}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              {totalOk
                ? "Total weight equals 100%."
                : `Total weight is ${Math.round(total * 100) / 100}% — active assessments must sum to 100%.`}
            </div>
          </div>
        ) : null}
      </section>
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
