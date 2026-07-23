"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { LEARNING_ACTIVITIES } from "@dse-pms/shared-types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dse-pms/ui";
import type { CloForm } from "./clos-section";
import { emptyWeek, weekSltForm, type WeekForm, type WeeklyPlanForm } from "./weekly-plan-model";

const TOPIC_MAX = 200;

export function AddWeekDialog({
  open,
  week,
  weeks,
  clos,
  existingAssessments,
  onCancel,
  onSave,
}: {
  open: boolean;
  /** The week being edited, or null when adding a new one. */
  week: WeekForm | null;
  /** The current list — used to number a new week and offer assessment suggestions. */
  weeks: WeeklyPlanForm;
  clos: CloForm[];
  existingAssessments: string[];
  onCancel: () => void;
  onSave: (draft: WeekForm) => void;
}) {
  const [draft, setDraft] = useState<WeekForm>(() => emptyWeek(weeks));
  const [touched, setTouched] = useState(false);

  // Re-seed the draft each time the dialog opens (a specific week, or a fresh one).
  useEffect(() => {
    if (open) {
      setDraft(week ?? emptyWeek(weeks));
      setTouched(false);
    }
  }, [open, week, weeks]);

  const set = (patch: Partial<WeekForm>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleClo = (code: string) =>
    setDraft((d) => ({
      ...d,
      cloCodes: d.cloCodes.includes(code)
        ? d.cloCodes.filter((c) => c !== code)
        : [...d.cloCodes, code],
    }));

  const errors = {
    topic: draft.topic.trim().length === 0,
    clos: draft.cloCodes.length === 0,
    activities: draft.activities.length === 0,
  };
  const hasError = errors.topic || errors.clos || errors.activities;

  const submit = () => {
    setTouched(true);
    if (hasError) return;
    onSave(draft);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onCancel() : undefined)}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{week ? `Edit Week ${draft.week}` : "Add Week"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. Week Information */}
          <Section n={1} title="Week Information">
            <Field label="Week No." required>
              <input
                type="number"
                min={1}
                max={52}
                value={draft.week}
                onChange={(e) => set({ week: e.target.value })}
                className={inputCls}
              />
              <Hint>Enter week number (e.g. 1, 2, 3…)</Hint>
            </Field>
          </Section>

          {/* 2. Topic / Content */}
          <Field label="Topic / Content" required>
            <textarea
              value={draft.topic}
              maxLength={TOPIC_MAX}
              onChange={(e) => set({ topic: e.target.value })}
              placeholder="Enter topic or content for this week"
              className={`min-h-[80px] w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                touched && errors.topic ? "border-status-live" : "border-border"
              }`}
            />
            <div className="flex items-center justify-between">
              {touched && errors.topic ? (
                <p className="text-xs text-status-live">A topic is required.</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-muted-foreground">
                {draft.topic.length} / {TOPIC_MAX}
              </span>
            </div>
          </Field>

          {/* 3. Link CLOs */}
          <Section n={3} title="Link CLOs" required>
            <p className="text-xs text-muted-foreground">Select the CLOs that this week contributes to.</p>
            {clos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                No CLOs defined yet. Add them on the CLOs tab first.
              </p>
            ) : (
              <ul className="space-y-2 rounded-lg border border-border p-3">
                {clos.map((clo) => (
                  <li key={clo.code}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        checked={draft.cloCodes.includes(clo.code)}
                        onChange={() => toggleClo(clo.code)}
                      />
                      <span>
                        <span className="font-medium text-foreground">{clo.code}</span>{" "}
                        <span className="text-muted-foreground">{clo.description || "—"}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {touched && errors.clos ? (
              <p className="text-xs text-status-live">Link at least one CLO.</p>
            ) : null}
          </Section>

          {/* 4. Learning Activities */}
          <Section n={4} title="Learning Activities" required>
            <ActivityPicker
              value={draft.activities}
              onChange={(activities) => set({ activities })}
            />
            {touched && errors.activities ? (
              <p className="text-xs text-status-live">Add at least one learning activity.</p>
            ) : null}
          </Section>

          {/* 5. Time Allocation */}
          <Section n={5} title="Time Allocation">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Contact Hours (L+T)">
                <input
                  type="number"
                  min={0}
                  value={draft.contactHours}
                  onChange={(e) => set({ contactHours: e.target.value })}
                  placeholder="e.g. 2"
                  className={inputCls}
                />
              </Field>
              <Field label="Self-Study Hours">
                <input
                  type="number"
                  min={0}
                  value={draft.selfStudyHours}
                  onChange={(e) => set({ selfStudyHours: e.target.value })}
                  placeholder="e.g. 3"
                  className={inputCls}
                />
              </Field>
              <Field label="SLT (Hours)">
                <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
                  {weekSltForm(draft)}
                </div>
                <Hint>Auto-calculated</Hint>
              </Field>
            </div>
          </Section>

          {/* 6. Assessment / Deliverables */}
          <Field label="Assessment / Deliverables">
            <input
              list="week-assessment-options"
              value={draft.assessment}
              onChange={(e) => set({ assessment: e.target.value })}
              placeholder="e.g. Lab 1, EDA Report…"
              className={inputCls}
            />
            <datalist id="week-assessment-options">
              {existingAssessments.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <Hint>Optional — a deliverable or assessment due this week.</Hint>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={submit}>Save Week</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Chip-based multi-select for learning activities: preset suggestions + free entry. */
function ActivityPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const suggestions = useMemo(
    () => LEARNING_ACTIVITIES.filter((a) => !value.includes(a)),
    [value],
  );

  const add = (raw: string) => {
    const name = raw.trim();
    if (!name || value.includes(name)) return;
    onChange([...value, name]);
    setInput("");
  };
  const remove = (name: string) => onChange(value.filter((v) => v !== name));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card p-2">
        {value.length === 0 ? (
          <span className="px-1 py-0.5 text-xs text-muted-foreground">No activities yet</span>
        ) : (
          value.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
            >
              {a}
              <button
                type="button"
                onClick={() => remove(a)}
                className="text-muted-foreground hover:text-status-live"
                aria-label={`Remove ${a}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          list="week-activity-options"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
          placeholder="Add or pick an activity…"
          className={`${inputCls} flex-1`}
        />
        <datalist id="week-activity-options">
          {suggestions.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        <Button type="button" variant="outline" size="sm" onClick={() => add(input)}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function Section({
  n,
  title,
  required,
  children,
}: {
  n: number;
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">
        {n}. {title}
        {required ? <span className="text-status-live"> *</span> : null}
      </h4>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-status-live"> *</span> : null}
      </span>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
