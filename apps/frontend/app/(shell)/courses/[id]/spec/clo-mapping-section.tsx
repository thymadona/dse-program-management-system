"use client";

import { FOCUS_LEVELS, type Method, type MethodKind } from "@dse-pms/shared-types";
import { ReferenceGuide } from "./reference-guide";
import { MethodChecklist } from "./method-checklist";
import type { CloForm } from "./clos-section";

/** A §15 mapping row held for input binding. */
export type CloMappingForm = {
  cloCode: string;
  sltHours: string;
  focus: string;
  focusPercent: string;
  teachingMethodIds: string[];
  assessmentMethodIds: string[];
};

function blankMapping(cloCode: string): CloMappingForm {
  return {
    cloCode,
    sltHours: "",
    focus: "",
    focusPercent: "",
    teachingMethodIds: [],
    assessmentMethodIds: [],
  };
}

/** Map the API's §15 payload into the string/array-based form model. */
export function toCloMappingForm(data: unknown): CloMappingForm[] {
  const items = (data as { items?: unknown[] } | undefined)?.items ?? [];
  const str = (v: unknown) => (v == null ? "" : String(v));
  const ids = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  return items.map((raw) => {
    const d = (raw ?? {}) as Record<string, unknown>;
    return {
      cloCode: str(d.cloCode),
      sltHours: str(d.sltHours),
      focus: str(d.focus),
      focusPercent: str(d.focusPercent),
      teachingMethodIds: ids(d.teachingMethodIds),
      assessmentMethodIds: ids(d.assessmentMethodIds),
    };
  });
}

/**
 * Reconcile saved mapping rows against the current §14 CLO list: one row per CLO,
 * in CLO order, preserving any saved values and dropping rows for deleted CLOs.
 */
export function reconcileMapping(clos: CloForm[], saved: CloMappingForm[]): CloMappingForm[] {
  const byCode = new Map(saved.map((row) => [row.cloCode, row]));
  return clos.map((clo) => byCode.get(clo.code) ?? blankMapping(clo.code));
}

/** Convert the reconciled rows into the CloMappingSection payload the API validates. */
export function toCloMappingPayload(rows: CloMappingForm[]) {
  return {
    items: rows.map((f) => ({
      cloCode: f.cloCode,
      sltHours: f.sltHours ? Number(f.sltHours) : null,
      focus: f.focus || null,
      focusPercent: f.focusPercent ? Number(f.focusPercent) : null,
      teachingMethodIds: f.teachingMethodIds,
      assessmentMethodIds: f.assessmentMethodIds,
    })),
  };
}

export function CloMappingSection({
  clos,
  value,
  onChange,
  teachingMethods,
  assessmentMethods,
  onAddMethod,
}: {
  clos: CloForm[];
  value: CloMappingForm[];
  onChange: (rows: CloMappingForm[]) => void;
  teachingMethods: Method[];
  assessmentMethods: Method[];
  onAddMethod: (kind: MethodKind, name: string) => Promise<Method>;
}) {
  const rows = reconcileMapping(clos, value);

  const update = (index: number, patch: Partial<CloMappingForm>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  if (clos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Add Course Learning Outcomes in <strong>§14</strong> first — this step maps each CLO to its
        PLO, teaching methods, and assessment methods.
      </p>
    );
  }

  const cloFor = (cloCode: string) => clos.find((c) => c.code === cloCode);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        For each CLO, record the Student Learning Time spent on its PLO, how strongly it focuses on
        that PLO, and the teaching and assessment methods used. The PLO and C/A/P level are carried
        over from §14.
      </p>

      <ReferenceGuide title="Focus on PLO (F / M / P)" rows={[...FOCUS_LEVELS]} />

      <div className="space-y-4">
        {rows.map((row, i) => {
          const clo = cloFor(row.cloCode);
          const ploId = clo?.ploId || "";
          const level = clo?.level || "";
          return (
            <fieldset key={row.cloCode} className="space-y-3 rounded-lg border border-border p-4">
              <legend className="flex flex-wrap items-center gap-2 px-1">
                <span className="text-sm font-semibold text-foreground">{row.cloCode}</span>
                <span className="text-xs text-muted-foreground">
                  {ploId ? `→ ${ploId}` : "→ no PLO set in §14"}
                  {level ? ` · ${level}` : ""}
                </span>
              </legend>

              {clo?.description ? (
                <p className="rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  {clo.description}
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">SLT hours on PLO</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 42"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={row.sltHours}
                    onChange={(e) => update(i, { sltHours: e.target.value })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Focus</span>
                  <select
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={row.focus}
                    onChange={(e) => update(i, { focus: e.target.value })}
                  >
                    <option value="">— Not set —</option>
                    {FOCUS_LEVELS.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.code} — {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Focus %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="e.g. 35"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    value={row.focusPercent}
                    onChange={(e) => update(i, { focusPercent: e.target.value })}
                  />
                </label>
              </div>

              <MethodChecklist
                label="Teaching method"
                options={teachingMethods}
                selectedIds={row.teachingMethodIds}
                onChange={(ids) => update(i, { teachingMethodIds: ids })}
                onAdd={(name) => onAddMethod("teaching", name)}
              />

              <MethodChecklist
                label="Assessment method"
                options={assessmentMethods}
                selectedIds={row.assessmentMethodIds}
                onChange={(ids) => update(i, { assessmentMethodIds: ids })}
                onAdd={(name) => onAddMethod("assessment", name)}
              />
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
