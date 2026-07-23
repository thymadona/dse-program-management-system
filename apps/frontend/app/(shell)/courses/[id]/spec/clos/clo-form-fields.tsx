"use client";

import {
  AFFECTIVE_LEVELS,
  COGNITIVE_LEVELS,
  PLOS,
  PSYCHOMOTOR_LEVELS,
  type Method,
} from "@dse-pms/shared-types";
import { Switch } from "@dse-pms/ui";
import type { CloForm } from "../clo-model";

const STATEMENT_MAX = 300;
const NOTES_MAX = 300;

/** The four §14 form sections, shared by the full-page Add CLO and Edit CLO routes. */
export function CloFormFields({
  draft,
  code,
  set,
  toggle,
  assessmentMethods,
  touched,
}: {
  draft: CloForm;
  /** The CLO code being edited, or null for a new CLO (assigned on save). */
  code: string | null;
  set: (patch: Partial<CloForm>) => void;
  toggle: (key: "mappedPlos" | "assessmentMethodIds", id: string) => void;
  assessmentMethods: Method[];
  touched: boolean;
}) {
  const statementError = touched && draft.description.trim().length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Left — CLO Information */}
      <div className="space-y-4">
        <SectionTitle n={1} title="CLO Information" />

        <Field label="CLO Code">
          <input
            readOnly
            value={code || "Assigned on save"}
            className="h-9 w-full cursor-default rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground"
          />
          <Hint>Codes are numbered automatically by order (CLO1, CLO2…).</Hint>
        </Field>

        <Field label="CLO Statement" required>
          <textarea
            value={draft.description}
            maxLength={STATEMENT_MAX}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Students will be able to…"
            className={`min-h-[96px] w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              statementError ? "border-status-live" : "border-border"
            }`}
          />
          <div className="flex items-center justify-between">
            <Hint>Clear and measurable statement of what students will be able to do.</Hint>
            <span className="text-xs text-muted-foreground">
              {draft.description.length} / {STATEMENT_MAX}
            </span>
          </div>
          {statementError ? (
            <p className="text-xs text-status-live">A CLO statement is required.</p>
          ) : null}
        </Field>

        <Field label="Bloom's Taxonomy Level">
          <select
            value={draft.level}
            onChange={(e) => set({ level: e.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
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
          <Hint>The cognitive level this CLO addresses.</Hint>
        </Field>

        <Field label="Status" required>
          <label className="flex items-center gap-3">
            <Switch
              checked={draft.status === "active"}
              onCheckedChange={(v) => set({ status: v ? "active" : "inactive" })}
            />
            <span className="text-sm text-foreground">
              {draft.status === "active" ? "Active" : "Inactive"}
            </span>
          </label>
          <Hint>Inactive CLOs will not be used in mapping and reports.</Hint>
        </Field>
      </div>

      {/* Right — mapping, methods, notes */}
      <div className="space-y-6">
        <div className="space-y-3">
          <SectionTitle n={2} title="Mapped PLOs" required />
          <p className="text-xs text-muted-foreground">Select the PLOs that this CLO contributes to.</p>
          <ul className="space-y-2 rounded-lg border border-border p-3">
            {PLOS.map((plo) => (
              <li key={plo.id}>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    checked={draft.mappedPlos.includes(plo.id)}
                    onChange={() => toggle("mappedPlos", plo.id)}
                  />
                  <span>
                    <span className="font-medium text-foreground">{plo.id}</span>{" "}
                    <span className="text-muted-foreground">{plo.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <SectionTitle n={3} title="Assessment Methods" />
          <p className="text-xs text-muted-foreground">Select the assessment methods that measure this CLO.</p>
          {assessmentMethods.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              No assessment methods defined yet. Add them from the Mapping tab.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-1.5 rounded-lg border border-border p-3 sm:grid-cols-2">
              {assessmentMethods.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      checked={draft.assessmentMethodIds.includes(m.id)}
                      onChange={() => toggle("assessmentMethodIds", m.id)}
                    />
                    {m.name}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label="">
          <SectionTitle n={4} title="Notes" optional />
          <textarea
            value={draft.notes}
            maxLength={NOTES_MAX}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Add any notes or comments about this CLO…"
            className="mt-2 min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">
              {draft.notes.length} / {NOTES_MAX}
            </span>
          </div>
        </Field>
      </div>
    </div>
  );
}

/** Validation shared between the fields above and the page that hosts them. */
export function cloFormErrors(draft: CloForm) {
  return {
    statement: draft.description.trim().length === 0,
  };
}

function SectionTitle({
  n,
  title,
  required,
  optional,
}: {
  n: number;
  title: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <h4 className="text-sm font-semibold text-foreground">
      {n}. {title}
      {required ? <span className="text-status-live"> *</span> : null}
      {optional ? <span className="font-normal text-muted-foreground"> (Optional)</span> : null}
    </h4>
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
      {label ? (
        <span className="block text-sm font-medium text-foreground">
          {label}
          {required ? <span className="text-status-live"> *</span> : null}
        </span>
      ) : null}
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
