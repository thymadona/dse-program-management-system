# §16 Distribution of Student Learning Time — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the §16 wizard section — a full-fidelity Student Learning Time grid that captures per-topic and per-assessment hours across activity types and delivery modes, and becomes the source of truth for §15's per-CLO SLT.

**Architecture:** §16 data persists as `CourseSpec.data.slt` JSON, validated by a new `SltSection` Zod schema registered in the existing `SPEC_SECTION_SCHEMAS`; the current `PUT /courses/:id/spec/:sectionId` endpoint saves it with no backend edits. Pure derivation helpers live in shared-types so both the grid and the §15 read-only integration reuse them. The grid is a new client component wired into `spec-client`.

**Tech Stack:** Bun, TypeScript, Zod, Express (backend), Next.js 15 + React + Tailwind (frontend), Prisma/Postgres (unchanged — no schema migration). Tests: `bun test`.

## Global Constraints

- Section id is `slt`; syllabus ref `§16`. Row groups are `content`, `continuous`, `final`.
- Activity codes are `L`/`T`/`P`/`O` (reuse existing `SLT_ACTIVITIES`); delivery modes are `physical`/`online`/`independent`.
- Hour cells: integers, 0–1000, absent = 0. Assessment weight: integer, 0–100, nullable.
- Every row carries a stable `id` (UUID) for future promotion to tables; content rows carry an optional `cloCode` referencing a §14 CLO; assessment rows carry no CLO.
- All totals are derived, never stored.
- Follow existing patterns: shared-types schemas are tested in `course-spec.test.ts` with `bun:test`; frontend section components mirror `clo-mapping-section.tsx` (string-based form model, `toXForm`/`toXPayload`, rendered by `spec-client`). No frontend unit-test runner exists — frontend tasks verify via typecheck + manual check.
- Test command: `bun test packages/shared-types/src/course-spec.test.ts`. Typecheck: `bun run typecheck`.

---

## File Structure

- **Modify** `packages/shared-types/src/course-spec.ts` — add `SltCells`, `SltTopicRow`, `SltAssessmentRow`, `SltSection` schemas; register `slt` in `SPEC_SECTION_SCHEMAS`; add `rowTotal`, `perCloSlt`, `sltSectionTotals` derivation helpers.
- **Modify** `packages/shared-types/src/course-spec.test.ts` — tests for schemas and helpers.
- **Create** `apps/frontend/app/(shell)/courses/[id]/spec/slt-section.tsx` — the §16 grid component + form model + payload mapping.
- **Modify** `packages/shared-types/src/course-spec.ts` (`SPEC_SECTIONS`) — flip `slt` to `state: "ready"`.
- **Modify** `apps/frontend/app/(shell)/courses/[id]/spec/spec-client.tsx` — load/hold §16 state, render `SltSection`, compute `sltByClo`, pass to §15.
- **Modify** `apps/frontend/app/(shell)/courses/[id]/spec/clo-mapping-section.tsx` — accept `sltByClo`, render derived SLT read-only with manual fallback.

No backend files change. No Prisma migration.

---

### Task 1: §16 Zod contracts + schema registration

**Files:**
- Modify: `packages/shared-types/src/course-spec.ts` (add schemas after the §15 `CloMappingSection` block, ~line 232; extend `SPEC_SECTION_SCHEMAS` ~line 235)
- Test: `packages/shared-types/src/course-spec.test.ts`

**Interfaces:**
- Consumes: existing `SPEC_SECTION_SCHEMAS`, `SLT_ACTIVITIES`.
- Produces:
  - `SltCells` — `z.infer` = `{ physical: SltCellRow; online: SltCellRow; independent: SltCellRow }` where `SltCellRow = { L?: number; T?: number; P?: number; O?: number }` (ints 0–1000).
  - `SltTopicRow` — `{ id: string; title: string; cloCode: string | null; cells: SltCells }`.
  - `SltAssessmentRow` — `{ id: string; title: string; weight: number | null; cells: SltCells }`.
  - `SltSection` — `{ content: SltTopicRow[]; continuous: SltAssessmentRow[]; final: SltAssessmentRow[] }`.
  - `SPEC_SECTION_SCHEMAS.slt === SltSection`.

- [ ] **Step 1: Write the failing tests**

Add to `packages/shared-types/src/course-spec.test.ts`:

```typescript
import { SltSection, SPEC_SECTION_SCHEMAS } from "./course-spec.ts";

const emptyCells = {
  physical: {}, online: {}, independent: {},
};

test("SltSection defaults each row group to []", () => {
  const parsed = SltSection.parse({});
  expect(parsed.content).toEqual([]);
  expect(parsed.continuous).toEqual([]);
  expect(parsed.final).toEqual([]);
});

test("SltSection coerces string hour cells to ints and fills missing cells", () => {
  const parsed = SltSection.parse({
    content: [{ id: "t1", title: "Topic 1", cloCode: "CLO1", cells: { physical: { L: "2" }, online: {}, independent: { P: "2" } } }],
  });
  expect(parsed.content[0]!.cells.physical.L).toBe(2);
  expect(parsed.content[0]!.cells.independent.P).toBe(2);
  expect(parsed.content[0]!.cloCode).toBe("CLO1");
});

test("SltSection rejects hour cells out of range", () => {
  const bad = { content: [{ id: "t1", title: "x", cloCode: null, cells: { ...emptyCells, physical: { L: 1001 } } }] };
  expect(SltSection.safeParse(bad).success).toBe(false);
});

test("SltAssessmentRow weight is optional and bounded 0-100", () => {
  const ok = SltSection.parse({ final: [{ id: "a1", title: "Report", weight: 40, cells: emptyCells }] });
  expect(ok.final[0]!.weight).toBe(40);
  const bad = { final: [{ id: "a1", title: "Report", weight: 101, cells: emptyCells }] };
  expect(SltSection.safeParse(bad).success).toBe(false);
});

test("slt is registered in SPEC_SECTION_SCHEMAS", () => {
  expect(SPEC_SECTION_SCHEMAS.slt).toBe(SltSection);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/shared-types/src/course-spec.test.ts`
Expected: FAIL — `SltSection` is not exported / undefined.

- [ ] **Step 3: Implement the schemas**

In `packages/shared-types/src/course-spec.ts`, after the `CloMappingSection` export (before the `SPEC_SECTION_SCHEMAS` declaration), add:

```typescript
/* --------------------------------------- §16 Distribution of Student Learning Time */

/** One hour value per activity (L/T/P/O). Absent = 0. Ints 0–1000. */
const SltHour = z.coerce.number().int().min(0).max(1000);
const SltCellRow = z
  .object({ L: SltHour, T: SltHour, P: SltHour, O: SltHour })
  .partial();
export type SltCellRow = z.infer<typeof SltCellRow>;

/** The 12-cell breakdown for one row: three delivery modes × L/T/P/O. */
export const SltCells = z
  .object({
    physical: SltCellRow.default({}),
    online: SltCellRow.default({}),
    independent: SltCellRow.default({}),
  })
  .default({ physical: {}, online: {}, independent: {} });
export type SltCells = z.infer<typeof SltCells>;

/** A §16 course-content topic row. `cloCode` references a §14 CLO. */
export const SltTopicRow = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  cloCode: z.string().nullable().default(null),
  cells: SltCells,
});
export type SltTopicRow = z.infer<typeof SltTopicRow>;

/** A §16 assessment row (continuous or final). No CLO; carries a % weight. */
export const SltAssessmentRow = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  weight: z.coerce.number().int().min(0).max(100).nullable().default(null),
  cells: SltCells,
});
export type SltAssessmentRow = z.infer<typeof SltAssessmentRow>;

export const SltSection = z.object({
  content: z.array(SltTopicRow).default([]),
  continuous: z.array(SltAssessmentRow).default([]),
  final: z.array(SltAssessmentRow).default([]),
});
export type SltSection = z.infer<typeof SltSection>;
```

Then extend the registry:

```typescript
export const SPEC_SECTION_SCHEMAS: Partial<Record<SpecSectionId, z.ZodTypeAny>> = {
  courseInfo: CourseInfoSection,
  clos: ClosSection,
  cloMapping: CloMappingSection,
  slt: SltSection,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/shared-types/src/course-spec.test.ts`
Expected: PASS (all §16 tests green, existing tests still green).

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/course-spec.ts packages/shared-types/src/course-spec.test.ts
git commit -m "feat(types): add §16 SLT section contracts + schema registration"
```

---

### Task 2: §16 derivation helpers

**Files:**
- Modify: `packages/shared-types/src/course-spec.ts` (add after the schemas from Task 1)
- Test: `packages/shared-types/src/course-spec.test.ts`

**Interfaces:**
- Consumes: `SltCells`, `SltTopicRow`, `SltAssessmentRow`, `SltSection` (Task 1).
- Produces:
  - `rowTotal(cells: SltCells): number` — sum of all 12 cells.
  - `perCloSlt(content: SltTopicRow[]): Record<string, number>` — content-topic hours summed by `cloCode`; rows with null/empty `cloCode` ignored.
  - `sltSectionTotals(section: SltSection): { contentTotal: number; continuousTotal: number; finalTotal: number; assessmentTotal: number; grandTotal: number }`.

- [ ] **Step 1: Write the failing tests**

Add to `packages/shared-types/src/course-spec.test.ts`:

```typescript
import { rowTotal, perCloSlt, sltSectionTotals, SltSection } from "./course-spec.ts";

const cells = (o: Record<string, Record<string, number>>) =>
  SltSection.parse({ content: [{ id: "x", title: "x", cloCode: null, cells: o }] }).content[0]!.cells;

test("rowTotal sums every cell across modes and activities", () => {
  expect(rowTotal(cells({ physical: { L: 2, P: 2 }, online: { L: 1 }, independent: { O: 3 } }))).toBe(8);
});

test("perCloSlt groups content hours by cloCode and ignores rows without a CLO", () => {
  const section = SltSection.parse({
    content: [
      { id: "1", title: "A", cloCode: "CLO1", cells: { physical: { L: 4 } } },
      { id: "2", title: "B", cloCode: "CLO1", cells: { physical: { L: 2 } } },
      { id: "3", title: "C", cloCode: "CLO2", cells: { physical: { L: 6 } } },
      { id: "4", title: "D", cloCode: null, cells: { physical: { L: 9 } } },
    ],
  });
  expect(perCloSlt(section.content)).toEqual({ CLO1: 6, CLO2: 6 });
});

test("sltSectionTotals cascades content, continuous, final into grand total", () => {
  const section = SltSection.parse({
    content: [{ id: "1", title: "A", cloCode: "CLO1", cells: { physical: { L: 10 } } }],
    continuous: [{ id: "c1", title: "Quiz", weight: 20, cells: { independent: { O: 4 } } }],
    final: [{ id: "f1", title: "Report", weight: 40, cells: { independent: { O: 6 } } }],
  });
  expect(sltSectionTotals(section)).toEqual({
    contentTotal: 10, continuousTotal: 4, finalTotal: 6, assessmentTotal: 10, grandTotal: 20,
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/shared-types/src/course-spec.test.ts`
Expected: FAIL — `rowTotal` / `perCloSlt` / `sltSectionTotals` not defined.

- [ ] **Step 3: Implement the helpers**

Append to `packages/shared-types/src/course-spec.ts`:

```typescript
/** Sum every hour cell in a row (all modes × L/T/P/O). */
export function rowTotal(cells: SltCells): number {
  const modes = [cells.physical, cells.online, cells.independent];
  return modes.reduce(
    (sum, m) => sum + (m.L ?? 0) + (m.T ?? 0) + (m.P ?? 0) + (m.O ?? 0),
    0,
  );
}

/** Content-topic hours summed per CLO. Rows without a cloCode are ignored. */
export function perCloSlt(content: SltTopicRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of content) {
    if (!row.cloCode) continue;
    out[row.cloCode] = (out[row.cloCode] ?? 0) + rowTotal(row.cells);
  }
  return out;
}

/** The §16 footer cascade: content + assessment totals → grand total. */
export function sltSectionTotals(section: SltSection) {
  const sum = (rows: { cells: SltCells }[]) =>
    rows.reduce((s, r) => s + rowTotal(r.cells), 0);
  const contentTotal = sum(section.content);
  const continuousTotal = sum(section.continuous);
  const finalTotal = sum(section.final);
  const assessmentTotal = continuousTotal + finalTotal;
  return {
    contentTotal,
    continuousTotal,
    finalTotal,
    assessmentTotal,
    grandTotal: contentTotal + assessmentTotal,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/shared-types/src/course-spec.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared-types/src/course-spec.ts packages/shared-types/src/course-spec.test.ts
git commit -m "feat(types): add §16 SLT derivation helpers (rowTotal, perCloSlt, totals)"
```

---

### Task 3: §16 grid component + wiring

**Files:**
- Create: `apps/frontend/app/(shell)/courses/[id]/spec/slt-section.tsx`
- Modify: `packages/shared-types/src/course-spec.ts` (`SPEC_SECTIONS`: flip `slt` `state` to `"ready"`)
- Modify: `apps/frontend/app/(shell)/courses/[id]/spec/spec-client.tsx`

**Interfaces:**
- Consumes: `SltSection`, `SltCells`, `SltTopicRow`, `SltAssessmentRow`, `SLT_ACTIVITIES`, `sltSectionTotals`, `rowTotal` (Tasks 1–2); `CloForm` from `./clos-section`.
- Produces (exported from `slt-section.tsx`):
  - `type SltForm` — `{ content: TopicRowForm[]; continuous: AssessmentRowForm[]; final: AssessmentRowForm[] }` (string-based cell values for input binding).
  - `EMPTY_SLT: SltForm`.
  - `toSltForm(data: unknown): SltForm`.
  - `toSltPayload(form: SltForm): unknown` — shape validated by `SltSection`.
  - `SltSection` **component** exported as `SltSectionForm` (avoid name clash with the schema): `SltSectionForm({ value, onChange, clos }: { value: SltForm; onChange: (v: SltForm) => void; clos: CloForm[] })`.

- [ ] **Step 1: Flip the section to ready**

In `packages/shared-types/src/course-spec.ts`, change the `slt` entry in `SPEC_SECTIONS`:

```typescript
  { id: "slt", title: "Student Learning Time", ref: "§16", part: "Part 2", state: "ready" },
```

- [ ] **Step 2: Create the grid component**

Create `apps/frontend/app/(shell)/courses/[id]/spec/slt-section.tsx`:

```tsx
"use client";

import {
  SLT_ACTIVITIES,
  rowTotal,
  sltSectionTotals,
  type SltSection as SltSectionData,
} from "@dse-pms/shared-types";
import type { CloForm } from "./clos-section";

const MODES = [
  { key: "physical", label: "Physical" },
  { key: "online", label: "Online" },
  { key: "independent", label: "Independent" },
] as const;
type ModeKey = (typeof MODES)[number]["key"];
type ActCode = "L" | "T" | "P" | "O";
const ACTS = SLT_ACTIVITIES.map((a) => a.code as ActCode);

/** String-based cell grid for input binding: cells[mode][act] = "2". */
export type CellForm = Record<ModeKey, Partial<Record<ActCode, string>>>;
export type TopicRowForm = { id: string; title: string; cloCode: string; cells: CellForm };
export type AssessmentRowForm = { id: string; title: string; weight: string; cells: CellForm };
export type SltForm = {
  content: TopicRowForm[];
  continuous: AssessmentRowForm[];
  final: AssessmentRowForm[];
};

export const EMPTY_SLT: SltForm = { content: [], continuous: [], final: [] };

const blankCells = (): CellForm => ({ physical: {}, online: {}, independent: {} });
const uuid = () => globalThis.crypto.randomUUID();
export const blankTopic = (): TopicRowForm => ({ id: uuid(), title: "", cloCode: "", cells: blankCells() });
export const blankAssessment = (): AssessmentRowForm => ({ id: uuid(), title: "", weight: "", cells: blankCells() });

const str = (v: unknown) => (v == null ? "" : String(v));

function cellsToForm(raw: unknown): CellForm {
  const d = (raw ?? {}) as Record<string, Record<string, unknown>>;
  const out = blankCells();
  for (const { key } of MODES) {
    const mode = d[key] ?? {};
    for (const act of ACTS) {
      if (mode[act] != null) out[key][act] = String(mode[act]);
    }
  }
  return out;
}

export function toSltForm(data: unknown): SltForm {
  const d = (data ?? {}) as Record<string, unknown[]>;
  const topics = (d.content ?? []).map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return { id: str(r.id) || uuid(), title: str(r.title), cloCode: str(r.cloCode), cells: cellsToForm(r.cells) };
  });
  const assess = (rows: unknown[] | undefined) =>
    (rows ?? []).map((raw) => {
      const r = (raw ?? {}) as Record<string, unknown>;
      return { id: str(r.id) || uuid(), title: str(r.title), weight: str(r.weight), cells: cellsToForm(r.cells) };
    });
  return { content: topics, continuous: assess(d.continuous), final: assess(d.final) };
}

function cellsToPayload(cells: CellForm) {
  const out: Record<string, Record<string, number>> = { physical: {}, online: {}, independent: {} };
  for (const { key } of MODES) {
    for (const act of ACTS) {
      const v = cells[key][act];
      if (v !== undefined && v !== "") out[key][act] = Number(v);
    }
  }
  return out;
}

export function toSltPayload(form: SltForm): SltSectionData {
  return {
    content: form.content.map((r) => ({ id: r.id, title: r.title, cloCode: r.cloCode || null, cells: cellsToPayload(r.cells) })),
    continuous: form.continuous.map((r) => ({ id: r.id, title: r.title, weight: r.weight === "" ? null : Number(r.weight), cells: cellsToPayload(r.cells) })),
    final: form.final.map((r) => ({ id: r.id, title: r.title, weight: r.weight === "" ? null : Number(r.weight), cells: cellsToPayload(r.cells) })),
  } as SltSectionData;
}

/** Numeric row total from the string form, for the live per-row Total column. */
function formRowTotal(cells: CellForm): number {
  let n = 0;
  for (const { key } of MODES) for (const act of ACTS) n += Number(cells[key][act] || 0);
  return n;
}

function reorder<T>(rows: T[], from: number, to: number): T[] {
  if (to < 0 || to >= rows.length) return rows;
  const copy = [...rows];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved!);
  return copy;
}

const inputCls =
  "h-8 w-12 rounded border border-border bg-card px-1 text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

function CellInputs({ cells, onCell }: { cells: CellForm; onCell: (mode: ModeKey, act: ActCode, v: string) => void }) {
  return (
    <>
      {MODES.map(({ key }) =>
        ACTS.map((act) => (
          <td key={`${key}-${act}`} className="px-0.5 py-1">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={cells[key][act] ?? ""}
              onChange={(e) => onCell(key, act, e.target.value)}
            />
          </td>
        )),
      )}
    </>
  );
}

function GridHead({ leadCols }: { leadCols: string[] }) {
  return (
    <thead>
      <tr className="text-xs text-muted-foreground">
        {leadCols.map((c) => (
          <th key={c} rowSpan={2} className="px-2 py-1 text-left align-bottom">{c}</th>
        ))}
        {MODES.map((m) => (
          <th key={m.key} colSpan={4} className="border-b border-border px-1 py-1 text-center">{m.label}</th>
        ))}
        <th rowSpan={2} className="px-2 py-1 text-center align-bottom">Total</th>
        <th rowSpan={2} className="px-2 py-1 align-bottom" />
      </tr>
      <tr className="text-[11px] text-muted-foreground">
        {MODES.map((m) => ACTS.map((a) => <th key={`${m.key}-${a}`} className="px-0.5 py-0.5 text-center">{a}</th>))}
      </tr>
    </thead>
  );
}

export function SltSectionForm({
  value,
  onChange,
  clos,
}: {
  value: SltForm;
  onChange: (v: SltForm) => void;
  clos: CloForm[];
}) {
  const totals = sltSectionTotals(toSltPayload(value));
  const weightSum =
    [...value.continuous, ...value.final].reduce((s, r) => s + (Number(r.weight) || 0), 0);
  const missingClo = value.content.some((r) => !r.cloCode);

  const setContent = (rows: TopicRowForm[]) => onChange({ ...value, content: rows });
  const setGroup = (g: "continuous" | "final", rows: AssessmentRowForm[]) => onChange({ ...value, [g]: rows });

  const cellSetter =
    <T extends { cells: CellForm }>(rows: T[], i: number, apply: (rows: T[]) => void) =>
    (mode: ModeKey, act: ActCode, v: string) =>
      apply(rows.map((r, idx) => (idx === i ? { ...r, cells: { ...r.cells, [mode]: { ...r.cells[mode], [act]: v } } } : r)));

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Distribute each topic&apos;s and assessment&apos;s Student Learning Time across delivery modes
        (Physical, Online, Independent) and activities — Lecture (L), Tutoring (T), Practice (P),
        Other (O). Totals and the Grand Total SLT are calculated automatically. Content-topic hours
        also drive each CLO&apos;s SLT in §15.
      </p>

      {/* -------- Course Content -------- */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Course Content</h3>
        {clos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-3 text-center text-xs text-muted-foreground">
            Add CLOs in §14 to tag topics with a CLO.
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-max border-collapse text-sm">
            <GridHead leadCols={["Topic", "CLO"]} />
            <tbody>
              {value.content.map((row, i) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-1">
                    <input
                      className="h-8 w-56 rounded border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      placeholder="Topic title"
                      value={row.title}
                      onChange={(e) => setContent(value.content.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <select
                      className="h-8 w-24 rounded border border-border bg-card px-1 text-sm text-foreground"
                      value={row.cloCode}
                      onChange={(e) => setContent(value.content.map((r, idx) => (idx === i ? { ...r, cloCode: e.target.value } : r)))}
                    >
                      <option value="">—</option>
                      {clos.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </td>
                  <CellInputs cells={row.cells} onCell={cellSetter(value.content, i, setContent)} />
                  <td className="px-2 py-1 text-center font-medium text-foreground">{formRowTotal(row.cells)}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs">
                    <RowControls
                      onUp={() => setContent(reorder(value.content, i, i - 1))}
                      onDown={() => setContent(reorder(value.content, i, i + 1))}
                      onRemove={() => setContent(value.content.filter((_, idx) => idx !== i))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <GroupFoot rows={value.content} label="Total SLT for Course Content" total={totals.contentTotal} leadSpan={2} />
          </table>
        </div>
        <AddRowButton label="Add topic" onClick={() => setContent([...value.content, blankTopic()])} />
      </section>

      {/* -------- Continuous & Final Assessment -------- */}
      {(["continuous", "final"] as const).map((g) => {
        const rows = value[g];
        const heading = g === "continuous" ? "Continuous Assessment" : "Final Assessment";
        const total = g === "continuous" ? totals.continuousTotal : totals.finalTotal;
        return (
          <section key={g} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-max border-collapse text-sm">
                <GridHead leadCols={["Assessment", "Weight %"]} />
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-2 py-1">
                        <input
                          className="h-8 w-56 rounded border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          placeholder="Assessment title"
                          value={row.title}
                          onChange={(e) => setGroup(g, rows.map((r, idx) => (idx === i ? { ...r, title: e.target.value } : r)))}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className={inputCls}
                          value={row.weight}
                          onChange={(e) => setGroup(g, rows.map((r, idx) => (idx === i ? { ...r, weight: e.target.value } : r)))}
                        />
                      </td>
                      <CellInputs cells={row.cells} onCell={cellSetter(rows, i, (rs) => setGroup(g, rs))} />
                      <td className="px-2 py-1 text-center font-medium text-foreground">{formRowTotal(row.cells)}</td>
                      <td className="whitespace-nowrap px-2 py-1 text-xs">
                        <RowControls
                          onUp={() => setGroup(g, reorder(rows, i, i - 1))}
                          onDown={() => setGroup(g, reorder(rows, i, i + 1))}
                          onRemove={() => setGroup(g, rows.filter((_, idx) => idx !== i))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <GroupFoot rows={rows} label={`Total SLT for ${heading}`} total={total} leadSpan={2} />
              </table>
            </div>
            <AddRowButton label="Add assessment" onClick={() => setGroup(g, [...rows, blankAssessment()])} />
          </section>
        );
      })}

      {/* -------- Totals + warnings -------- */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-4 text-sm">
        <TotalRow label="Total SLT for Assessment" value={totals.assessmentTotal} />
        <TotalRow label="Grand Total SLT" value={totals.grandTotal} strong />
      </div>
      {weightSum !== 100 && (value.continuous.length + value.final.length > 0) ? (
        <p className="text-xs text-amber-600">⚠ Assessment weights total {weightSum}% (should be 100%).</p>
      ) : null}
      {missingClo ? (
        <p className="text-xs text-amber-600">⚠ Some topics have no CLO selected.</p>
      ) : null}
    </div>
  );
}

function RowControls({ onUp, onDown, onRemove }: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  return (
    <span className="inline-flex gap-1">
      <button type="button" onClick={onUp} className="rounded px-1 text-muted-foreground hover:text-foreground" aria-label="Move up">↑</button>
      <button type="button" onClick={onDown} className="rounded px-1 text-muted-foreground hover:text-foreground" aria-label="Move down">↓</button>
      <button type="button" onClick={onRemove} className="rounded px-1 text-muted-foreground hover:text-status-live" aria-label="Remove">✕</button>
    </span>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-accent hover:text-foreground">
      ＋ {label}
    </button>
  );
}

function GroupFoot({ rows, label, total, leadSpan }: { rows: { cells: CellForm }[]; label: string; total: number; leadSpan: number }) {
  const colTotal = (mode: ModeKey, act: ActCode) => rows.reduce((s, r) => s + Number(r.cells[mode][act] || 0), 0);
  return (
    <tfoot>
      <tr className="border-t border-border bg-muted/40 text-xs font-medium text-foreground">
        <td colSpan={leadSpan} className="px-2 py-1">{label}</td>
        {MODES.map((m) => ACTS.map((a) => <td key={`${m.key}-${a}`} className="px-0.5 py-1 text-center">{colTotal(m.key, a) || ""}</td>))}
        <td className="px-2 py-1 text-center">{total}</td>
        <td />
      </tr>
    </tfoot>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-foreground" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "text-base font-bold text-foreground" : "font-medium text-foreground"}>{value} h</span>
    </div>
  );
}
```

- [ ] **Step 3: Wire into `spec-client.tsx`**

In `apps/frontend/app/(shell)/courses/[id]/spec/spec-client.tsx`:

Add the import near the other section imports:

```tsx
import {
  SltSectionForm,
  EMPTY_SLT,
  toSltForm,
  toSltPayload,
  type SltForm,
} from "./slt-section";
```

Add state next to the other section state (~line 44):

```tsx
  const [slt, setSlt] = useState<SltForm>(EMPTY_SLT);
```

In `load`, after `setCloMapping(...)` (~line 62), populate it:

```tsx
      setSlt(toSltForm(spec.data.slt));
```

In `handleSave`, add a branch alongside the others (after the `cloMapping` branch, ~line 108):

```tsx
      } else if (activeId === "slt") {
        await courseSpecApi.saveSection(courseId, "slt", toSltPayload(slt));
      }
```

In the render switch, add a branch before the `ComingSoon` fallback (~line 205):

```tsx
          ) : activeId === "slt" ? (
            <SltSectionForm value={slt} onChange={setSlt} clos={clos} />
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS (no type errors in shared-types or frontend).

- [ ] **Step 5: Manual verification**

Run the app (`bun run dev`), open a course spec, go to §16. Verify: rows add/remove/reorder; entering hours updates the per-row Total, the per-column footers, and the Grand Total; weight-sum and missing-CLO warnings appear; Save persists and a reload restores the grid.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/\(shell\)/courses/\[id\]/spec/slt-section.tsx apps/frontend/app/\(shell\)/courses/\[id\]/spec/spec-client.tsx packages/shared-types/src/course-spec.ts
git commit -m "feat(web): §16 Student Learning Time distribution grid"
```

---

### Task 4: §15 reads §16 as source of truth

**Files:**
- Modify: `apps/frontend/app/(shell)/courses/[id]/spec/clo-mapping-section.tsx`
- Modify: `apps/frontend/app/(shell)/courses/[id]/spec/spec-client.tsx`

**Interfaces:**
- Consumes: `perCloSlt` (Task 2), `toSltPayload` (Task 3), `CloMappingSection` component and `toCloMappingPayload` (existing).
- Produces: `CloMappingSection` gains an optional `sltByClo?: Record<string, number>` prop; `toCloMappingPayload(rows, sltByClo?)` gains an optional second arg that, when a CLO has a derived value, overrides `sltHours`.

- [ ] **Step 1: Thread derived SLT through the §15 payload builder**

In `clo-mapping-section.tsx`, update `toCloMappingPayload` to accept and prefer derived values:

```tsx
export function toCloMappingPayload(rows: CloMappingForm[], sltByClo?: Record<string, number>) {
  const effective = rows.map((r) => {
    const derived = sltByClo?.[r.cloCode];
    return derived != null ? { ...r, sltHours: String(derived) } : r;
  });
  const total = totalSlt(effective);
  return {
    items: effective.map((f) => {
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
```

- [ ] **Step 2: Render derived SLT read-only in the §15 grid**

In `clo-mapping-section.tsx`, add `sltByClo` to the component props:

```tsx
export function CloMappingSection({
  clos,
  value,
  onChange,
  teachingMethods,
  assessmentMethods,
  onAddMethod,
  sltByClo,
}: {
  clos: CloForm[];
  value: CloMappingForm[];
  onChange: (rows: CloMappingForm[]) => void;
  teachingMethods: Method[];
  assessmentMethods: Method[];
  onAddMethod: (kind: MethodKind, name: string) => Promise<Method>;
  sltByClo?: Record<string, number>;
}) {
```

Compute effective rows and total from the derived map right after `const rows = reconcileMapping(clos, value);`:

```tsx
  const hasDerived = !!sltByClo && Object.keys(sltByClo).length > 0;
  const effectiveHours = (row: CloMappingForm) =>
    hasDerived && sltByClo![row.cloCode] != null ? String(sltByClo![row.cloCode]) : row.sltHours;
  const total = rows.reduce((sum, r) => sum + (Number(effectiveHours(r)) || 0), 0);
```

(Remove the old `const total = totalSlt(rows);` line — it's replaced above.)

Inside the row map, base `percent` on the effective hours:

```tsx
          const hours = effectiveHours(row);
          const percent = focusPercentOf(hours, total);
```

Replace the SLT-hours `<input>` block with a conditional: read-only display when derived, editable otherwise:

```tsx
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-foreground">SLT hours on PLO</span>
                  {hasDerived ? (
                    <div
                      className="flex h-9 w-full items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground"
                      title="Summed from §16 topic hours for this CLO"
                    >
                      {sltByClo![row.cloCode] ?? 0} h · from §16
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      placeholder="e.g. 42"
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      value={row.sltHours}
                      onChange={(e) => update(i, { sltHours: e.target.value })}
                    />
                  )}
                </label>
```

- [ ] **Step 3: Provide `sltByClo` from `spec-client.tsx`**

In `spec-client.tsx`, import `perCloSlt` and `toSltPayload`:

```tsx
import { perCloSlt } from "@dse-pms/shared-types";
```

(`toSltPayload` is already imported from `./slt-section` in Task 3.)

Compute the map (after `activeMeta`/`next` memos, before `handleSave`):

```tsx
  const sltByClo = useMemo(() => perCloSlt(toSltPayload(slt).content), [slt]);
```

Pass it to the §15 render branch:

```tsx
          ) : activeId === "cloMapping" ? (
            <CloMappingSection
              clos={clos}
              value={cloMapping}
              onChange={setCloMapping}
              teachingMethods={teachingMethods}
              assessmentMethods={assessmentMethods}
              onAddMethod={handleAddMethod}
              sltByClo={sltByClo}
            />
```

And use it when saving §15:

```tsx
      } else if (activeId === "cloMapping") {
        const reconciled = reconcileMapping(clos, cloMapping);
        setCloMapping(reconciled);
        await courseSpecApi.saveSection(courseId, "cloMapping", toCloMappingPayload(reconciled, sltByClo));
      }
```

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Manual verification**

In the app: add §16 content topics tagged to CLOs with hours; open §15 — each CLO's "SLT hours on PLO" shows the summed value read-only ("from §16"), and focus %/F/M/P recompute from it. Remove all §16 content rows — §15 returns to a manual editable input. Save §15 and reload — the derived value persists.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/app/\(shell\)/courses/\[id\]/spec/clo-mapping-section.tsx apps/frontend/app/\(shell\)/courses/\[id\]/spec/spec-client.tsx
git commit -m "feat(web): §15 SLT derives from §16 topic hours (read-only with fallback)"
```

---

## Self-Review Notes

- **Spec coverage:** contracts + registration (Task 1) ✓; derivation helpers incl. `perCloSlt` (Task 2) ✓; full-fidelity 12-cell grid, three sub-tables, up/down reorder, cascading totals, soft warnings (Task 3) ✓; §16→§15 source-of-truth with manual fallback (Task 4) ✓; JSON storage via existing endpoint, no backend/Prisma change ✓; stable row ids ✓.
- **Backend:** no code task needed — `SltSection` in `SPEC_SECTION_SCHEMAS` (Task 1) is consumed by the existing `PUT /:id/spec/:sectionId` validation path.
- **Type consistency:** schema export `SltSection` vs. component `SltSectionForm` disambiguated to avoid a name clash; `toCloMappingPayload` second arg optional so existing callers keep working; `perCloSlt` operates on `toSltPayload(...).content` (typed `SltTopicRow[]`).
- **Placeholder scan:** no TBD/TODO; every code step shows complete code.
