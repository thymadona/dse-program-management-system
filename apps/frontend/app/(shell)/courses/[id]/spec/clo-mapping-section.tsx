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

/** Total SLT across the section: the sum of every CLO's SLT hours. */
export function totalSlt(rows: CloMappingForm[]): number {
  return rows.reduce((sum, r) => sum + (Number(r.sltHours) || 0), 0);
}

/** A CLO's share of the total SLT, as a whole percent. `null` when not yet computable. */
export function focusPercentOf(sltHours: string, total: number): number | null {
  const hours = Number(sltHours);
  if (!total || !hours) return null;
  return Math.round((hours / total) * 100);
}

/** F/M/P category derived from a focus percentage (§15 legend: F >50%, M 31–50%, P ≤30%). */
export function focusCodeOf(percent: number | null): string {
  if (percent == null) return "";
  if (percent > 50) return "F";
  if (percent >= 31) return "M";
  return "P";
}

/**
 * Convert the reconciled rows into the CloMappingSection payload the API validates.
 * Focus % and its F/M/P category are derived from each CLO's share of the total SLT.
 */
export function toCloMappingPayload(rows: CloMappingForm[]) {
  const total = totalSlt(rows);
  return {
    items: rows.map((f) => {
      const percent = focusPercentOf(f.sltHours, total);
      return {
        cloCode: f.cloCode,
        sltHours: f.sltHours ? Number(f.sltHours) : null,
        focus: focusCodeOf(percent) || null,
        focusPercent: percent,
        teachingMethodIds: f.teachingMethodIds,
        assessmentMethodIds: f.assessmentMethodIds,
      };
    }),
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
  const total = totalSlt(rows);

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
        For each CLO, record the Student Learning Time spent on its PLO, plus the teaching and
        assessment methods used. Focus % and its F/M/P category are calculated automatically from
        each CLO&apos;s share of the total SLT. The PLO and C/A/P level are carried over from §14.
      </p>

      <ReferenceGuide title="Focus on PLO (F / M / P)" rows={[...FOCUS_LEVELS]} />

      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total SLT (sum of CLO hours)</span>
        <span className="font-semibold text-foreground">{total} h</span>
      </div>

      <div className="space-y-4">
        {rows.map((row, i) => {
          const clo = cloFor(row.cloCode);
          const ploId = clo?.ploId || "";
          const level = clo?.level || "";
          const percent = focusPercentOf(row.sltHours, total);
          const focusCode = focusCodeOf(percent);
          const focusName = FOCUS_LEVELS.find((f) => f.code === focusCode)?.name;
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
                <div className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Focus (auto)</span>
                  <div
                    className="flex h-9 w-full items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                    title="Derived from this CLO's share of the total SLT"
                  >
                    {focusCode ? `${focusCode} — ${focusName}` : "—"}
                  </div>
                </div>
                <div className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">Focus % (auto)</span>
                  <div
                    className="flex h-9 w-full items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                    title="This CLO's SLT hours ÷ total SLT"
                  >
                    {percent == null ? "—" : `${percent}%`}
                  </div>
                </div>
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
