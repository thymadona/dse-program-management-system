# §16 — Distribution of Student Learning Time (SLT): Design

**Date:** 2026-07-22
**Section:** `slt` · RUPP syllabus §16
**Status:** approved, pending spec review

## Purpose

Build the §16 wizard section: the full-fidelity Student Learning Time grid. For
each course-content topic and each assessment, a lecturer records how learning
hours are distributed across four activity types (Lecture / Tutoring / Practice /
Other) and three delivery modes (Physical F2F / Online-synchronous /
Independent-asynchronous). The section rolls those hours up into cascading totals
and becomes the **source of truth** for the per-CLO SLT that §15 currently holds.

This is the densest input surface in the wizard so far.

## Decisions (settled during brainstorming)

1. **Full fidelity.** Reproduce all 12 hour cells per row (3 delivery modes ×
   L/T/P/O), plus per-row and grand totals — matching the official form exactly.
2. **JSON storage, not new tables.** §16 data lives in `CourseSpec.data.slt` like
   every other section. Rows carry stable `id`s so §17 (Assessment Plan) and §18
   (Lesson Plan) can promote topics/assessments to first-class tables later
   without reshaping data. No new Prisma model, no new backend plugin in Phase 1.
3. **§16 is the source of truth for §15 SLT.** Content-topic hours summed per CLO
   feed §15's per-CLO SLT. When §16 has topics, §15's SLT hours become read-only
   and derived; focus % and F/M/P recompute from them exactly as today. When §16
   is empty, §15 stays manually editable (backward compatible).
4. **Reorder via up/down buttons.** No drag-and-drop dependency in Phase 1.

## Data model — `CourseSpec.data.slt`

Stored as opaque section JSON, validated by a new Zod schema. Three row groups:

```jsonc
{
  "content":    [ /* SltTopicRow */ ],
  "continuous": [ /* SltAssessmentRow */ ],
  "final":      [ /* SltAssessmentRow */ ]
}
```

**Hour cells** (the 12-cell breakdown; each value an int 0–1000, absent = 0):

```jsonc
// SltCells
{
  "physical":    { "L": 2, "T": 0, "P": 0, "O": 0 },
  "online":      { "L": 0, "T": 0, "P": 0, "O": 0 },
  "independent": { "L": 0, "T": 0, "P": 2, "O": 0 }
}
```

**Content topic row** (`SltTopicRow`):

```jsonc
{ "id": "uuid", "title": "Topic 1: Intro to Predictive Analytics",
  "cloCode": "CLO1", "cells": { /* SltCells */ } }
```

**Assessment row** (`SltAssessmentRow`) — used for both `continuous` and `final`:

```jsonc
{ "id": "uuid", "title": "Mid-term Quiz", "weight": 20, "cells": { /* SltCells */ } }
```

- `id`: stable UUID generated client-side (`crypto.randomUUID()`) so §15
  derivation keys and future table promotion have durable identity.
- `cloCode`: references a §14 CLO; nullable. Assessment rows carry no CLO
  (matches the reference form — assessment hours are not attributed to a CLO).
- All totals (row total, per-column subtotals, section totals, grand total) are
  **derived on read**, never stored, so nothing can drift.

## Contracts — `packages/shared-types/src/course-spec.ts`

Add alongside the existing section schemas:

- `SltActivity` — reuse existing `SLT_ACTIVITIES` codes (`L`/`T`/`P`/`O`).
- `SltCells` — `z.object` of `physical`/`online`/`independent`, each an object of
  four optional ints (`z.coerce.number().int().min(0).max(1000)`).
- `SltTopicRow` — `{ id, title, cloCode: nullable, cells: SltCells }`.
- `SltAssessmentRow` — `{ id, title, weight: int 0–100 nullable, cells: SltCells }`.
- `SltSection` — `{ content: SltTopicRow[], continuous: SltAssessmentRow[], final: SltAssessmentRow[] }`.
- Register in `SPEC_SECTION_SCHEMAS`: `slt: SltSection`.

Pure derivation helpers (also in shared-types so both apps and tests reuse them):

- `rowTotal(cells): number` — sum of all 12 cells.
- `perCloSlt(content: SltTopicRow[]): Record<string, number>` — sum `rowTotal`
  by `cloCode`, ignoring rows with no CLO.
- `sltSectionTotals(section)` — returns `{ contentTotal, continuousTotal,
  finalTotal, assessmentTotal, grandTotal }` for the footer cascade.

## Backend

No new plugin. The existing `PUT /courses/:id/spec/:sectionId` already validates
against `SPEC_SECTION_SCHEMAS[sectionId]` and upserts `CourseSpec.data[sectionId]`;
adding `slt` to that registry is the whole backend change. `getSpec` already
returns `data.slt` verbatim — no loader change. No Course mirroring (nothing in
§16 overlaps Course scalars).

## §15 ↔ §16 integration

- `clo-mapping-section.tsx` gains an optional `sltByClo?: Record<string, number>`
  prop derived from `data.slt.content` via `perCloSlt`.
- `spec-client` computes `sltByClo` from the loaded §16 data and passes it to §15.
- When `sltByClo` has entries: the §15 "SLT hours on PLO" input renders read-only,
  showing the derived value with a hint ("from §16"); focus %/F/M/P recompute from
  it through the existing `focusPercentOf` / `focusCodeOf` path.
- When §16 has no content topics: §15 behaves exactly as today (manual input).
- `toCloMappingPayload` prefers the derived value when present so what persists
  matches what's shown.

## Frontend §16 grid

- Flip `slt` to `state: "ready"` in `SPEC_SECTIONS`.
- New `slt-section.tsx`, rendered by `spec-client` (new `activeId === "slt"` branch;
  saved through the same `courseSpecApi.saveSection` path, so `canSave` applies).
- Layout: three stacked sub-tables — **Course Content**, **Continuous Assessment**,
  **Final Assessment** — each in an `overflow-x: auto` container (the grid is wide;
  the page body must never scroll horizontally).
- Column groups per row: `Physical [L T P O] · Online [L T P O] · Independent
  [L T P O] · Total (derived)`. Content rows add a leading **CLO** dropdown
  (options = §14 CLOs). Assessment rows add a **Weight %** input.
- Per row: up/down reorder buttons + remove; a "＋ Add row" per sub-table.
- Live footers: per-column subtotals for each sub-table, then the cascade
  Total Course Content → Total CA → Total Final → **Total Assessment** →
  **Grand Total SLT**, using `sltSectionTotals`.
- Empty content state points the lecturer to add §14 CLOs first if none exist
  (CLO dropdown would otherwise be empty), consistent with §15's guard copy.

## Validation (soft, non-blocking)

Shown inline as warnings; they never block Save (the official form tolerates
in-progress drafts):

- The combined assessment weights (all `continuous` + all `final` rows) should
  sum to 100%; warn when they don't. (In the reference sample the CA and Final
  rows together total 100%.)
- Every content topic should have a CLO selected.

## Testing

- `rowTotal` and `sltSectionTotals` cascade math (including empty/partial cells).
- `perCloSlt` grouping: multiple topics per CLO, topics with no CLO ignored.
- §15 derivation: read-only path when §16 has topics vs. manual fallback when empty;
  `toCloMappingPayload` persists the derived value.
- `SltSection` Zod round-trip: coercion of string inputs, min/max bounds,
  save→load through the existing spec endpoint.
- Weight-sum warning threshold.

## Out of scope (later phases)

- Promoting topics/assessments to first-class tables (deferred until §17/§18).
- Drag-and-drop reordering.
- §17 Course Assessment Plan and §18 Lesson Plan (separate sections; they will
  reuse the same `id`-bearing rows).
