"use client";

import {
  AFFECTIVE_LEVELS,
  ASSESSMENT_FORMATS,
  ASSESSMENT_TYPES,
  COGNITIVE_LEVELS,
  PLOS,
  PSYCHOMOTOR_LEVELS,
  SUBMISSION_METHODS,
} from "@dse-pms/shared-types";
import { Switch } from "@dse-pms/ui";
import type { CloForm } from "../clo-model";
import type { AssessmentForm } from "../assessment-model";

const DESCRIPTION_MAX = 500;
const INSTRUCTIONS_MAX = 500;
const NOTES_MAX = 500;

/** The five §17 form sections, shared by the full-page Add and Edit Assessment routes. */
export function AssessmentFormFields({
  draft,
  set,
  toggle,
  clos,
  touched,
}: {
  draft: AssessmentForm;
  set: (patch: Partial<AssessmentForm>) => void;
  toggle: (key: "cloCodes" | "mappedPlos", id: string) => void;
  clos: CloForm[];
  touched: boolean;
}) {
  const nameError = touched && draft.name.trim().length === 0;

  return (
    <div className="space-y-8">
      {/* 1. Assessment Information */}
      <Section n={1} title="Assessment Information">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Assessment Name" required error={nameError ? "An assessment name is required." : undefined}>
            <input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="e.g. Assignment 1"
              className={inputCls(nameError)}
            />
          </Field>

          <Field label="Type" required>
            <select value={draft.type} onChange={(e) => set({ type: e.target.value })} className={selectCls}>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description" className="md:col-span-2">
            <textarea
              value={draft.description}
              maxLength={DESCRIPTION_MAX}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Describe what this assessment involves…"
              className="min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <Counter value={draft.description.length} max={DESCRIPTION_MAX} />
          </Field>

          <Field label="Assessment Method" required>
            <select
              value={draft.mode}
              onChange={(e) => set({ mode: e.target.value as AssessmentForm["mode"] })}
              className={selectCls}
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>
          </Field>

          <Field label="Status" required>
            <label className="flex h-9 items-center gap-3">
              <Switch
                checked={draft.status === "active"}
                onCheckedChange={(v) => set({ status: v ? "active" : "inactive" })}
              />
              <span className="text-sm text-foreground">{draft.status === "active" ? "Active" : "Inactive"}</span>
            </label>
            <Hint>Inactive assessments are excluded from the weighting total.</Hint>
          </Field>
        </div>
      </Section>

      {/* 2. Linking */}
      <Section n={2} title="Linking">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Linked CLOs" required>
            {clos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                No CLOs defined yet. Add them on the CLOs tab first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2.5">
                {clos.map((clo) => {
                  const on = draft.cloCodes.includes(clo.code);
                  return (
                    <button
                      key={clo.code}
                      type="button"
                      onClick={() => toggle("cloCodes", clo.code)}
                      title={clo.description}
                      className={chipToggleCls(on)}
                    >
                      {clo.code}
                    </button>
                  );
                })}
              </div>
            )}
            <Hint>Select the CLOs that this assessment measures.</Hint>
          </Field>

          <Field label="Bloom's Level (Target)">
            <select value={draft.bloomLevel} onChange={(e) => set({ bloomLevel: e.target.value })} className={selectCls}>
              <option value="">— Select level —</option>
              <optgroup label="Cognitive">
                {COGNITIVE_LEVELS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Affective">
                {AFFECTIVE_LEVELS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Psychomotor">
                {PSYCHOMOTOR_LEVELS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code} — {l.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
        </div>
      </Section>

      {/* 3. Weighting & Scheduling */}
      <Section n={3} title="Weighting & Scheduling">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Field label="Weight (%)" required>
            <div className="flex">
              <input
                type="number"
                min={0}
                max={100}
                value={draft.weight}
                onChange={(e) => set({ weight: e.target.value })}
                placeholder="e.g. 10"
                className={`${inputCls(false)} rounded-r-none`}
              />
              <span className="inline-flex h-9 items-center rounded-r-lg border border-l-0 border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                %
              </span>
            </div>
            <Hint>Total weight must equal 100%.</Hint>
          </Field>

          <Field label="Due Week" required>
            <select value={draft.dueWeek} onChange={(e) => set({ dueWeek: e.target.value })} className={selectCls}>
              <option value="">— Select week —</option>
              {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assessment Duration" optional>
            <div className="flex">
              <input
                type="number"
                min={0}
                value={draft.durationWeeks}
                onChange={(e) => set({ durationWeeks: e.target.value })}
                placeholder="e.g. 1"
                className={`${inputCls(false)} rounded-r-none`}
              />
              <span className="inline-flex h-9 items-center rounded-r-lg border border-l-0 border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                weeks
              </span>
            </div>
            <Hint>Estimated time for students to complete.</Hint>
          </Field>
        </div>
      </Section>

      {/* 4. Assessment Details */}
      <Section n={4} title="Assessment Details">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Assessment Format / Deliverables">
            <input
              list="assessment-format-options"
              value={draft.format}
              onChange={(e) => set({ format: e.target.value })}
              placeholder="e.g. Written Report"
              className={inputCls(false)}
            />
            <datalist id="assessment-format-options">
              {ASSESSMENT_FORMATS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </Field>

          <Field label="Submission Method">
            <input
              list="assessment-submission-options"
              value={draft.submissionMethod}
              onChange={(e) => set({ submissionMethod: e.target.value })}
              placeholder="e.g. LMS (Upload)"
              className={inputCls(false)}
            />
            <datalist id="assessment-submission-options">
              {SUBMISSION_METHODS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>

          <Field label="Instructions to Students">
            <textarea
              value={draft.instructions}
              maxLength={INSTRUCTIONS_MAX}
              onChange={(e) => set({ instructions: e.target.value })}
              placeholder="Guidance for students on how to complete and submit…"
              className="min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <Counter value={draft.instructions.length} max={INSTRUCTIONS_MAX} />
          </Field>

          <Field label="Rubric">
            <input
              value={draft.rubric}
              onChange={(e) => set({ rubric: e.target.value })}
              placeholder="e.g. Assignment Rubric – Written Report"
              className={inputCls(false)}
            />
            <Hint>Name of the rubric used to grade this assessment.</Hint>
          </Field>
        </div>
      </Section>

      {/* 5. Mapping to PLOs */}
      <Section n={5} title="Mapping to PLOs" optional>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Mapped PLOs">
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-border p-2.5">
              {PLOS.map((plo) => {
                const on = draft.mappedPlos.includes(plo.id);
                return (
                  <button
                    key={plo.id}
                    type="button"
                    onClick={() => toggle("mappedPlos", plo.id)}
                    title={plo.description}
                    className={chipToggleCls(on)}
                  >
                    {plo.id}
                  </button>
                );
              })}
            </div>
            <Hint>Select the PLOs that this assessment contributes to.</Hint>
          </Field>

          <Field label="Notes" optional>
            <textarea
              value={draft.notes}
              maxLength={NOTES_MAX}
              onChange={(e) => set({ notes: e.target.value })}
              placeholder="Add any notes about this assessment…"
              className="min-h-[88px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <Counter value={draft.notes.length} max={NOTES_MAX} />
          </Field>
        </div>
      </Section>
    </div>
  );
}

/** Validation shared between the fields above and the page that hosts them. */
export function assessmentFormErrors(draft: AssessmentForm) {
  return {
    name: draft.name.trim().length === 0,
  };
}

/* ------------------------------------------------------------------------- shared */

const inputBase =
  "h-9 w-full rounded-lg border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const inputCls = (error: boolean) => `${inputBase} ${error ? "border-status-live" : "border-border"}`;
const selectCls = `${inputBase} border-border`;

const chipToggleCls = (on: boolean) =>
  `inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors ${
    on
      ? "bg-accent text-accent-foreground"
      : "border border-border bg-card text-muted-foreground hover:bg-muted"
  }`;

function Section({
  n,
  title,
  optional,
  children,
}: {
  n: number;
  title: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">
        {n}. {title}
        {optional ? <span className="font-normal text-muted-foreground"> (Optional)</span> : null}
      </h4>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <span className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-status-live"> *</span> : null}
        {optional ? <span className="font-normal text-muted-foreground"> (Optional)</span> : null}
      </span>
      {children}
      {error ? <p className="text-xs text-status-live">{error}</p> : null}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <div className="flex justify-end">
      <span className="text-xs text-muted-foreground">
        {value} / {max}
      </span>
    </div>
  );
}
