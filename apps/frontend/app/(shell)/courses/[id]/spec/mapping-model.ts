import {
  ALIGNMENT_STRENGTHS,
  alignmentBand,
  cloAlignmentAverages,
  componentsMapped,
  mappingCellKey,
  mappingDistribution,
  mappingOverallPercent,
  meanStrength,
  type MappingCell,
  type MappingComponentKind,
  type MappingSection,
} from "@dse-pms/shared-types";
import type { CloForm } from "./clo-model";
import type { WeekForm } from "./weekly-plan-model";
import type { AssessmentForm } from "./assessment-model";

export { ALIGNMENT_STRENGTHS, alignmentBand };

/**
 * The Alignment Mapping section (§14–18 cross-reference) held as a form model — a
 * flat list of rated cells, converted on save by the wizard. Absent cells are
 * *unrated*, distinct from an explicit "None" (strength 0).
 */
export type MappingForm = MappingCell[];

export const EMPTY_MAPPING: MappingForm = [];

/** One matrix column: a Weekly Plan week or an Assessment. */
export type MappingColumn = {
  kind: MappingComponentKind;
  /** The week/assessment stable id, matched against a cell's `ref`. */
  ref: string;
  /** Short header label (e.g. "W3", "Midterm Quiz"). */
  label: string;
  /** Optional tooltip / secondary label (the week topic or assessment status). */
  title: string;
  /** Which CLO codes the source row already links to (binary §17/§18 links). */
  linkedClos: string[];
};

/** Map the API's `mapping` payload into the form model, tolerating older/absent shapes. */
export function toMappingForm(data: unknown): MappingForm {
  const cells = (data as { cells?: unknown[] } | undefined)?.cells ?? [];
  return cells
    .map((raw) => {
      const d = (raw ?? {}) as Record<string, unknown>;
      const kind = d.kind === "assessment" ? "assessment" : "week";
      const strength = Math.max(0, Math.min(3, Math.round(Number(d.strength) || 0)));
      return {
        cloCode: String(d.cloCode ?? ""),
        kind: kind as MappingComponentKind,
        ref: String(d.ref ?? ""),
        strength,
      };
    })
    .filter((c) => c.cloCode && c.ref);
}

/** Convert the form model into the MappingSection payload, dropping cells for removed rows/columns. */
export function toMappingPayload(cells: MappingForm, valid: ValidRefs): MappingSection {
  return { cells: reconcileCells(cells, valid) } as MappingSection;
}

export type ValidRefs = {
  cloCodes: Set<string>;
  weekRefs: Set<string>;
  assessmentRefs: Set<string>;
};

/** The set of CLO codes / week ids / assessment ids currently present, for orphan filtering. */
export function validRefs(
  clos: CloForm[],
  weeks: WeekForm[],
  assessments: AssessmentForm[],
): ValidRefs {
  return {
    cloCodes: new Set(clos.map((c) => c.code)),
    weekRefs: new Set(weeks.map((w) => w.id)),
    assessmentRefs: new Set(assessments.map((a) => a.id)),
  };
}

/** Drop cells whose CLO or component no longer exists (e.g. a week/assessment was deleted). */
export function reconcileCells(cells: MappingForm, valid: ValidRefs): MappingForm {
  return cells.filter(
    (c) =>
      valid.cloCodes.has(c.cloCode) &&
      (c.kind === "week" ? valid.weekRefs.has(c.ref) : valid.assessmentRefs.has(c.ref)),
  );
}

/** Build the ordered matrix columns: weeks (by week number) then assessments. */
export function buildColumns(weeks: WeekForm[], assessments: AssessmentForm[]): {
  weekColumns: MappingColumn[];
  assessmentColumns: MappingColumn[];
} {
  const weekColumns = [...weeks]
    .sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0))
    .map<MappingColumn>((w) => ({
      kind: "week",
      ref: w.id,
      label: `W${w.week || "?"}`,
      title: w.topic || `Week ${w.week}`,
      linkedClos: w.cloCodes,
    }));
  const assessmentColumns = assessments.map<MappingColumn>((a) => ({
    kind: "assessment",
    ref: a.id,
    label: a.name || "Untitled",
    title: a.status === "inactive" ? `${a.name} (inactive)` : a.name,
    linkedClos: a.cloCodes,
  }));
  return { weekColumns, assessmentColumns };
}

const cellIndex = (cells: MappingForm) => {
  const map = new Map<string, number>();
  for (const c of cells) map.set(mappingCellKey(c.kind, c.ref, c.cloCode), c.strength);
  return map;
};

/** Strength of one cell, or null when unrated. */
export function cellStrength(
  cells: MappingForm,
  kind: MappingComponentKind,
  ref: string,
  cloCode: string,
): number | null {
  const s = cells.find((c) => c.kind === kind && c.ref === ref && c.cloCode === cloCode);
  return s ? s.strength : null;
}

/**
 * Return a new cells array with one cell set to `strength`, or removed when
 * `strength` is null (clearing the rating). Replaces any existing rating for the cell.
 */
export function setCell(
  cells: MappingForm,
  kind: MappingComponentKind,
  ref: string,
  cloCode: string,
  strength: number | null,
): MappingForm {
  const rest = cells.filter((c) => !(c.kind === kind && c.ref === ref && c.cloCode === cloCode));
  if (strength == null) return rest;
  return [...rest, { kind, ref, cloCode, strength: Math.max(0, Math.min(3, Math.round(strength))) }];
}

/**
 * Seed a Medium (2) rating for every existing binary §17/§18 CLO link that has no
 * rating yet, leaving already-rated cells untouched. Used by "Auto-fill from links".
 */
export function seedFromLinks(cells: MappingForm, columns: MappingColumn[]): MappingForm {
  const idx = cellIndex(cells);
  const seeded: MappingForm = [...cells];
  for (const col of columns) {
    for (const cloCode of col.linkedClos) {
      if (!idx.has(mappingCellKey(col.kind, col.ref, cloCode))) {
        seeded.push({ kind: col.kind, ref: col.ref, cloCode, strength: 2 });
      }
    }
  }
  return seeded;
}

/* --------------------------------------------------------------------- metrics */

export type MappingMetrics = {
  cloCount: number;
  weeksTotal: number;
  weeksMapped: number;
  assessmentsTotal: number;
  assessmentsMapped: number;
  overallPercent: number;
  ratedCount: number;
  distribution: { value: 0 | 1 | 2 | 3; count: number }[];
  perClo: { code: string; average: number | null }[];
};

/** Roll up every headline figure the Mapping tab shows from the rated cells + columns. */
export function mappingMetrics(
  cells: MappingForm,
  cloCodes: string[],
  weekColumns: MappingColumn[],
  assessmentColumns: MappingColumn[],
): MappingMetrics {
  const dist = mappingDistribution(cells);
  return {
    cloCount: cloCodes.length,
    weeksTotal: weekColumns.length,
    weeksMapped: componentsMapped(cells, "week", weekColumns.map((c) => c.ref)),
    assessmentsTotal: assessmentColumns.length,
    assessmentsMapped: componentsMapped(cells, "assessment", assessmentColumns.map((c) => c.ref)),
    overallPercent: mappingOverallPercent(cells),
    ratedCount: cells.length,
    distribution: ([3, 2, 1, 0] as const).map((value) => ({ value, count: dist[value] })),
    perClo: cloAlignmentAverages(cells, cloCodes),
  };
}

/** Average strength of one column (across CLOs), or null when the column has no ratings. */
export function columnAverage(
  cells: MappingForm,
  kind: MappingComponentKind,
  ref: string,
): number | null {
  return meanStrength(cells.filter((c) => c.kind === kind && c.ref === ref));
}

/* ----------------------------------------------------------------------- export */

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Build a CSV of the whole matrix: one row per CLO, one column per week/assessment,
 * with the strength band name in each cell (blank when unrated). Ends with an average row.
 */
export function mappingCsv(
  cells: MappingForm,
  clos: CloForm[],
  weekColumns: MappingColumn[],
  assessmentColumns: MappingColumn[],
): string {
  const columns = [...weekColumns, ...assessmentColumns];
  const header = ["CLO", "Description", ...columns.map((c) => c.label), "Average"];
  const bandName = (v: number | null) => (v == null ? "" : alignmentBand(v)?.name ?? "");
  const rows = clos.map((clo) => {
    const rowAvg = meanStrength(cells.filter((c) => c.cloCode === clo.code));
    return [
      clo.code,
      clo.description,
      ...columns.map((col) => bandName(cellStrength(cells, col.kind, col.ref, clo.code))),
      rowAvg == null ? "" : rowAvg.toFixed(1),
    ];
  });
  const avgRow = [
    "Average",
    "",
    ...columns.map((col) => {
      const a = columnAverage(cells, col.kind, col.ref);
      return a == null ? "" : a.toFixed(1);
    }),
    (() => {
      const overall = meanStrength(cells);
      return overall == null ? "" : overall.toFixed(1);
    })(),
  ];
  return [header, ...rows, avgRow].map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Trigger a client-side download of `text` as a file named `filename`. */
export function downloadTextFile(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
