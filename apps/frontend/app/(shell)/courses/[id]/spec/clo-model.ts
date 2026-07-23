import { CAP_LEVELS, COGNITIVE_LEVELS } from "@dse-pms/shared-types";

/** A CLO held as a form model for input binding; converted on save by the wizard. */
export type CloForm = {
  code: string;
  description: string;
  level: string;
  mappedPlos: string[];
  assessmentMethodIds: string[];
  status: "active" | "inactive";
  notes: string;
};

export const EMPTY_CLOS: CloForm[] = [];

/** A fresh, empty CLO (code is assigned by position on save). */
export function emptyClo(): CloForm {
  return {
    code: "",
    description: "",
    level: "",
    mappedPlos: [],
    assessmentMethodIds: [],
    status: "active",
    notes: "",
  };
}

/** Assign CLO codes by position so they stay sequential after add/remove. */
export function withCodes(items: CloForm[]): CloForm[] {
  return items.map((item, i) => ({ ...item, code: `CLO${i + 1}` }));
}

const asStr = (v: unknown) => (v == null ? "" : String(v));
const asStrArray = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);

/** Map the API's §14 payload into the string-based form model, migrating legacy fields. */
export function toClosForm(data: unknown): CloForm[] {
  const items = (data as { items?: unknown[] } | undefined)?.items ?? [];
  return withCodes(
    items.map((raw) => {
      const d = (raw ?? {}) as Record<string, unknown>;
      // Legacy rows carried a single `ploId`; fold it into mappedPlos.
      const mappedPlos = asStrArray(d.mappedPlos);
      if (mappedPlos.length === 0 && d.ploId) mappedPlos.push(String(d.ploId));
      return {
        code: asStr(d.code),
        description: asStr(d.description),
        level: asStr(d.level),
        mappedPlos,
        assessmentMethodIds: asStrArray(d.assessmentMethodIds),
        status: d.status === "inactive" ? "inactive" : "active",
        notes: asStr(d.notes),
      };
    }),
  );
}

/** Convert the form model into the ClosSection payload the API validates. */
export function toClosPayload(items: CloForm[]) {
  return {
    items: withCodes(items).map((f) => ({
      code: f.code,
      description: f.description.trim(),
      level: f.level || null,
      mappedPlos: f.mappedPlos,
      assessmentMethodIds: f.assessmentMethodIds,
      status: f.status,
      notes: f.notes.trim(),
    })),
  };
}

/* ------------------------------------------------------------- Bloom palette */

/** Display colours for a Bloom level — chips, dots, and the distribution bar. */
export type BloomStyle = {
  name: string;
  dot: string;
  bar: string;
  chip: string;
};

/** Cognitive levels (C1–C6) carry the reference colour scheme. */
const COGNITIVE_STYLE: Record<string, Omit<BloomStyle, "name">> = {
  C1: { dot: "#3b82f6", bar: "#3b82f6", chip: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" },
  C2: { dot: "#22c55e", bar: "#22c55e", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" },
  C3: { dot: "#f59e0b", bar: "#f59e0b", chip: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  C4: { dot: "#8b5cf6", bar: "#8b5cf6", chip: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" },
  C5: { dot: "#ef4444", bar: "#ef4444", chip: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300" },
  C6: { dot: "#ec4899", bar: "#ec4899", chip: "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300" },
};

const NEUTRAL_STYLE: Omit<BloomStyle, "name"> = {
  dot: "#94a3b8",
  bar: "#94a3b8",
  chip: "bg-muted text-muted-foreground",
};

/** Look up the display name + palette for a C/A/P level code. */
export function bloomStyle(code: string): BloomStyle {
  const entry = CAP_LEVELS.find((l) => l.code === code);
  const style = COGNITIVE_STYLE[code] ?? NEUTRAL_STYLE;
  return { name: entry?.name ?? code ?? "—", ...style };
}

/** The six cognitive Bloom levels, in order — drives the distribution bar. */
export const BLOOM_COGNITIVE = COGNITIVE_LEVELS;
