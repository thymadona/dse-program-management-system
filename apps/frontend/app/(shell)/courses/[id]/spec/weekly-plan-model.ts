import type { WeeklyPlanSection } from "@dse-pms/shared-types";

/**
 * The Weekly Plan (§18) held as a form model for input binding, converted on save
 * by the wizard. Hours are kept as strings so empty inputs stay empty rather than 0.
 */
export type WeekForm = {
  id: string;
  week: string;
  topic: string;
  cloCodes: string[];
  activities: string[];
  contactHours: string;
  selfStudyHours: string;
  assessment: string;
};

export type WeeklyPlanForm = WeekForm[];

export const EMPTY_WEEKLY_PLAN: WeeklyPlanForm = [];

const uuid = () => globalThis.crypto.randomUUID();
const str = (v: unknown) => (v == null ? "" : String(v));
const strArray = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);

/** A fresh week, numbered one past the current highest week. */
export function emptyWeek(existing: WeeklyPlanForm): WeekForm {
  const nextNo = existing.reduce((max, w) => Math.max(max, Number(w.week) || 0), 0) + 1;
  return {
    id: uuid(),
    week: String(nextNo),
    topic: "",
    cloCodes: [],
    activities: [],
    contactHours: "",
    selfStudyHours: "",
    assessment: "",
  };
}

/**
 * Map the API's §18 payload into the form model. Tolerates the retired §16 grid
 * shape (which had no `weeks` array) by yielding an empty plan.
 */
export function toWeeklyPlanForm(data: unknown): WeeklyPlanForm {
  const weeks = (data as { weeks?: unknown[] } | undefined)?.weeks ?? [];
  return weeks
    .map((raw) => {
      const d = (raw ?? {}) as Record<string, unknown>;
      return {
        id: str(d.id) || uuid(),
        week: str(d.week),
        topic: str(d.topic),
        cloCodes: strArray(d.cloCodes),
        activities: strArray(d.activities),
        contactHours: d.contactHours == null ? "" : String(d.contactHours),
        selfStudyHours: d.selfStudyHours == null ? "" : String(d.selfStudyHours),
        assessment: str(d.assessment),
      };
    })
    .sort((a, b) => (Number(a.week) || 0) - (Number(b.week) || 0));
}

/** Convert the form model into the WeeklyPlanSection payload the API validates. */
export function toWeeklyPlanPayload(form: WeeklyPlanForm): WeeklyPlanSection {
  return {
    weeks: form.map((w) => ({
      id: w.id,
      week: Number(w.week) || 1,
      topic: w.topic.trim(),
      cloCodes: w.cloCodes,
      activities: w.activities,
      contactHours: w.contactHours === "" ? null : Number(w.contactHours),
      selfStudyHours: w.selfStudyHours === "" ? null : Number(w.selfStudyHours),
      assessment: w.assessment.trim(),
    })),
  } as WeeklyPlanSection;
}

/** Weekly SLT for the form model: Contact + Self-Study (blank counts as 0). */
export function weekSltForm(w: WeekForm): number {
  return (Number(w.contactHours) || 0) + (Number(w.selfStudyHours) || 0);
}

/** Footer totals across the form model. */
export function weeklyPlanFormTotals(form: WeeklyPlanForm) {
  return form.reduce(
    (acc, w) => {
      acc.contactHours += Number(w.contactHours) || 0;
      acc.selfStudyHours += Number(w.selfStudyHours) || 0;
      acc.slt += weekSltForm(w);
      return acc;
    },
    { contactHours: 0, selfStudyHours: 0, slt: 0 },
  );
}

/* ------------------------------------------------------------- CLO badge palette */

/** Chip colours for a CLO badge, cycled by CLO number (CLO1 blue, CLO2 green, …). */
const CLO_CHIPS = [
  "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
];

/** Tailwind chip classes for a CLO code (e.g. "CLO3"), cycling the palette by number. */
export function cloChip(code: string): string {
  const n = Number(code.replace(/\D/g, ""));
  if (!n) return "bg-muted text-muted-foreground";
  return CLO_CHIPS[(n - 1) % CLO_CHIPS.length]!;
}
