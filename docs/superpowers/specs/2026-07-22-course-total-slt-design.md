# Course-level Total SLT: Design

**Date:** 2026-07-22
**Status:** approved, pending spec review

## Purpose

Add an admin-entered "Total SLT (hours)" number to each course — e.g. 120h — stored
on the `Course` row alongside `credits`, shown on the courses list, and editable in
the Add/Edit Course dialog. It replaces the current denominator used by §15's
Focus %/Focus (F/M/P) calculation: today that denominator is the sum of the CLO
rows' own SLT hours within §15; going forward it is this course-level admin number
(e.g. CLO1 SLT 26h ÷ course total 120h = 22% → F/M/P).

This is a plain scalar on `Course`, independent of the `CourseSpec` JSON document —
same tier as `credits`, not part of any wizard section's data.

## Decisions (settled during brainstorming)

1. **New Course column, not spec JSON.** `Course.totalSltHours Int?`, mirroring how
   `credits` is stored — keeps it sortable/filterable as a plain list column and
   independent of whether any wizard section has been filled in.
2. **Admin manual entry only — no derivation from §16.** Unlike §15's per-CLO SLT
   (which derives from §16 topic hours), this course-level total is always a direct
   admin input. It is intentionally decoupled from §16 fidelity.
3. **When unset, Focus/Focus % show "—".** If a course has no `totalSltHours` yet,
   §15 cannot compute a percentage — no fallback to the old sum-of-rows behavior.
   This keeps "Focus %" meaning exactly one thing: a CLO's share of the course's
   declared total, never a different denominator.
4. **§15 summary panel shows only the course total**, not a reconciliation against
   the sum of CLO rows entered so far (no "104 of 120 h allocated" indicator). Out
   of scope for this change; can be revisited later if needed.
5. **No mirroring into `CourseInfoSection`/prefill.** Unlike `credits` (which is
   part of the §1–13 Course Information wizard section and prefills from/mirrors
   onto `Course`), `totalSltHours` has no wizard-section counterpart to sync with.

## Data model

`apps/backend/prisma/schema.prisma`, on `model Course`:

```prisma
model Course {
  ...
  credits       Int?
  totalSltHours Int?
  ...
}
```

New migration via `bun run --cwd apps/backend db:migrate`.

## Shared types (`packages/shared-types/src/courses.ts`)

- `CourseSchema`: add `totalSltHours: z.number().int().nullable().optional()`.
- `CreateCourseInput`: add `totalSltHours: z.coerce.number().int().min(0).nullable().optional()`.
- `UpdateCourseInput` stays `CreateCourseInput.partial()` — no change needed beyond
  the base schema gaining the field.

No backend service changes: `courseService.create`/`update` pass the whole
validated input straight to Prisma with no field allowlist, and
`list`/`getDetailed`/`getById` return full rows with no `select` clause, so the new
column flows through automatically once it exists in the schema and Prisma model.

## Frontend — courses list & form

- `apps/frontend/app/(shell)/courses/courses-client.tsx`: new `DataTable` column,
  key `totalSltHours`, header "Total SLT", rendering `{n} h` or a muted `—`.
- `apps/frontend/app/(shell)/courses/course-form.tsx`: new "Total SLT (hours)"
  field, same local-state-string pattern already used for `credits` (empty string
  submits as `null`). Placed alongside Credits (§4) and Course type (§11) in that
  row — becomes a 3-column grid.
- `apps/frontend/lib/courses.ts`: add `coursesApi.get(id)` (`GET /api/courses/:id`,
  route already exists via `courseService.getDetailed`) — needed by the wizard (see
  below), doesn't currently exist on the client.

## Frontend — §15 CLO mapping (`clo-mapping-section.tsx`)

- `CloMappingSection` gains a new required prop `courseTotalSlt: number | null`.
- `focusPercentOf(sltHours, total)` keeps its signature, but callers now pass
  `courseTotalSlt` instead of a locally-summed total. When `courseTotalSlt` is
  `null`, treat as not computable (existing `if (!total ...) return null` behavior
  already covers this once the caller passes `null`/`0` through).
- `toCloMappingPayload(rows, sltByClo, courseTotalSlt)` gains a third parameter,
  passed through to the same `focusPercentOf` call when building the persisted
  payload.
- The exported `totalSlt(rows)` sum-of-rows helper is deleted — nothing needs a
  row-summed total anymore.
- The summary panel changes from "Total SLT (sum of CLO hours): X h" to "Total SLT
  (course): 120 h", or "Total SLT (course): — · set it on the course" when
  `courseTotalSlt` is `null`.

## Frontend — wizard wiring (`spec-client.tsx`)

- Currently only fetches the `CourseSpec` document (`courseSpecApi.get`) and
  methods — never the `Course` row. Add a `coursesApi.get(courseId)` call
  alongside the existing `Promise.all([...])` load, store `totalSltHours` in state,
  and pass it to `<CloMappingSection courseTotalSlt={...} .../>`.

## Out of scope

- No reconciliation/warning UI comparing §15's allocated CLO hours against the
  course total.
- No change to §16 (Distribution of SLT) — it remains fully independent of this
  course-level number.
- No mirroring of `totalSltHours` into any `CourseSpec` section data.

## Testing

- `packages/shared-types` gains no new pure functions worth unit-testing beyond
  what Zod validation already covers (`totalSltHours` min/int checks are exercised
  the same way `credits` already is, if such tests exist).
- Manual verification: set a course's Total SLT in the Add/Edit dialog, confirm it
  appears in the list column, open its spec wizard §15, confirm Focus %/Focus
  compute against that number, and confirm they show "—" for a course with no
  Total SLT set.
