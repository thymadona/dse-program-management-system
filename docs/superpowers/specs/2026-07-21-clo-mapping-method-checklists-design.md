# §15 CLO → PLO Mapping: method checklists + shared method vocabulary

**Date:** 2026-07-21
**Section:** Course Specification wizard, §15 "CLO → PLO Mapping & Methods" (`cloMapping`)
**Status:** Approved — ready for implementation plan

## Problem

Today the §15 mapping form captures **Teaching method** and **Assessment method** as two
free-text `<textarea>`s. That has two costs:

1. The lecturer types the same methods every time, with no shared vocabulary — the data is
   unstructured prose buried in a JSON document, so it can never be compared across courses
   or teachers.
2. The card gives no context: it shows only the CLO code and its PLO/level, not the CLO
   description the lecturer is mapping.

The goal driving this work: **accumulate the teaching and assessment methods teachers
actually use as structured data**, so that a later phase can answer "how does each teacher
teach, and how has that changed over time." This spec builds the *foundation* for that — it
does **not** build the analytics.

## Scope

**In scope**

- Two global, seeded reference tables holding the method vocabulary.
- A `methods` plugin exposing read + add endpoints.
- §15 UI: per-CLO **checkbox lists** for Teaching and Assessment methods (with a ticked-count
  badge and an inline "+ Add method"), plus the CLO description shown read-only in each card.
- Selections stored as **method IDs** inside the §15 spec document.

**Explicitly out of scope** (foundation only)

- Change history / snapshots of §15 over time.
- A per-teacher "how they teach" dashboard or any reporting.
- An admin CRUD screen for curating the vocabulary.
- A separate free-text "note" field (qualifiers live inside the method name, e.g.
  `Demonstration (Python, EDA)`).
- A separate relational selection table (selections live in the spec JSON, consistent with
  the rest of the wizard).

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Selection widget | **Checkbox list** — one checkbox per method (name only), ticked-count badge next to the field label. Multi-select via ticking. |
| CLO description in §15 | **Shown** read-only in each card, carried from §14. |
| Vocabulary lifecycle | **Shared, growing global list.** Seeded from PAN202; lecturers can add new methods that persist to the table and become checkboxes for everyone. |
| Method "meaning" column | **No** — the method name is the label (may include parenthetical qualifiers). |
| Where ticks are stored | **Method IDs in the §15 spec document**, saved on the wizard's Save button. |
| Vocabulary storage | **Two tables** — `TeachingMethod`, `AssessmentMethod`. |

## Data model

New Prisma models (`apps/backend/prisma/schema.prisma`) + one migration:

```prisma
/// Reference vocabulary for §15 teaching methods. Global and shared across all
/// courses; grows as lecturers add new methods from the course-spec form.
model TeachingMethod {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
}

/// Reference vocabulary for §15 assessment methods. Same lifecycle as TeachingMethod.
model AssessmentMethod {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
}
```

`name` is unique so adding a method that already exists reuses the existing row (case-sensitive
match; the add endpoint trims whitespace and treats an existing name as success, returning the
existing row).

### Seed (`apps/backend/prisma/seed.ts`)

Idempotent `upsert` by `name`. Initial vocabulary (derived from the PAN202 syllabus + the
methods the user listed):

- **Teaching:** Lecture, Guided Hands-on Lab, Demonstration, Lab-based Learning,
  Step-by-step Coding, Scaffolded Exercises, Tutoring, Practice, Case Study, Seminar,
  Team-based Learning, Project-Based Learning, Presentation, Flipped Classroom,
  Group Discussion.
- **Assessment:** Assignment, Mid-term Quiz, Final Exam, Quiz, Lab Report, Project,
  Presentation & Defence, Peer Review, Reflection Journal.

## Backend: `methods` plugin

New plugin at `apps/backend/src/plugins/methods/` (`index.ts`, `router.ts`, `service.ts`),
mirroring the students/courses plugin pattern. Registered in `apps/backend/src/core/app.ts`;
manifest added to `packages/shared-types/src/plugins.ts` (`methodsManifest`, no sidebar route).

**Endpoints** (mounted at `/api/methods`, all require auth):

- `GET /api/methods` → `{ teaching: Method[], assessment: Method[] }`, each list sorted by
  `name`. Permission: `methods:read`. One fetch fills both pickers.
- `POST /api/methods/teaching` — body `{ name }`. Permission: `methods:write`. Trims the name;
  if a row with that name exists, returns it (200), else creates it (201). Empty/blank name → 400.
- `POST /api/methods/assessment` — same, for assessment methods.

**Permissions** (`apps/backend/src/core/permissions/index.ts`): add `methods:read` to all three
roles, `methods:write` to `admin` and `lecturer`.

`Method` shape returned to the client: `{ id: string; name: string }`.

## Shared types

New file `packages/shared-types/src/methods.ts` (exported from `index.ts`):

- `Method` type / Zod `MethodSchema` = `{ id, name }`.
- `MethodKind` = `"teaching" | "assessment"`.
- `CreateMethodInput` = `z.object({ name: z.string().trim().min(1) })`.
- `MethodsResponse` = `{ teaching: Method[]; assessment: Method[] }`.
- `methodsManifest: PluginManifest` (`id: "methods"`, no routes,
  `permissions: ["methods:read", "methods:write"]`), appended to `pluginManifests`.

### §15 schema change (`packages/shared-types/src/course-spec.ts`)

`CloMappingItem` changes:

```ts
export const CloMappingItem = z.object({
  cloCode: z.string().min(1),
  sltHours: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  focus: FocusCode.nullable().optional(),
  focusPercent: z.coerce.number().int().min(0).max(100).nullable().optional(),
  teachingMethodIds: z.array(z.string()).default([]),
  assessmentMethodIds: z.array(z.string()).default([]),
});
```

The old `teachingMethod` / `assessmentMethod` string fields are removed. IDs are not validated
for existence server-side — they originate from our own `/api/methods` responses (newly-added
methods are POSTed first, so they exist before the section is saved). Previously saved §15
free-text is not migrated (dev/demo data only); on load, absent ID arrays default to `[]`.

## Frontend

### API client — `apps/frontend/lib/methods.ts`

```ts
export const methodsApi = {
  list(): Promise<MethodsResponse>,                       // GET /api/methods
  add(kind: MethodKind, name: string): Promise<Method>,   // POST /api/methods/{kind}
};
```

### `spec-client.tsx`

- Load the method vocabulary once (alongside the spec) into state: `teachingMethods`,
  `assessmentMethods`.
- Pass both lists + an `onAddMethod(kind, name)` callback down to `CloMappingSection`. The
  callback calls `methodsApi.add`, appends the returned method to the relevant list, and
  returns it so the caller can tick it immediately.

### `clo-mapping-section.tsx`

- Form model: replace `teachingMethod`/`assessmentMethod` strings with
  `teachingMethodIds: string[]` / `assessmentMethodIds: string[]` in `CloMappingForm`.
- `toCloMappingForm` / `toCloMappingPayload` map the ID arrays (default `[]`).
- Each CLO card renders the **CLO description** (from the matching `CloForm.description`) as
  read-only muted text under the legend.
- The two textareas are replaced by a new `MethodChecklist` component (below), one for
  teaching and one for assessment.

### New component — `apps/frontend/app/(shell)/courses/[id]/spec/method-checklist.tsx`

Props: `label`, `options: Method[]`, `selectedIds: string[]`, `onChange(ids)`,
`onAdd(name) => Promise<Method>`.

Renders:
- The label with a ticked-count badge, e.g. `Teaching method (4)`.
- A checkbox per option (`name`); ticking toggles the id in `selectedIds`.
- An inline "+ Add method" text input; on submit calls `onAdd`, then ticks the returned method.
  Duplicate names resolve to the existing method (no duplicate checkbox) and get ticked.

## Data flow

1. Wizard opens → `spec-client` fetches the spec **and** `GET /api/methods`.
2. §15 card shows CLO description + two checklists rendered from the vocabulary, pre-ticked
   from the saved `*MethodIds`.
3. Lecturer ticks/unticks → local form state. Adding a new method → `POST /api/methods/{kind}`
   → row persisted to the table → appended to options → ticked.
4. **Save** → `toCloMappingPayload` sends `{ items: [{ cloCode, sltHours, focus, focusPercent,
   teachingMethodIds, assessmentMethodIds }] }` → validated by `CloMappingSection` schema →
   stored in `CourseSpec.data.cloMapping`.

## Testing

- **Backend**: `methods.service` add-is-idempotent (existing name returns existing row; blank
  rejected); `GET /api/methods` shape + sort. `CloMappingSection` schema accepts ID arrays and
  defaults missing arrays to `[]`.
- **Frontend**: `MethodChecklist` — count badge reflects ticks; toggling updates ids; "+ Add"
  ticks the new method. `toCloMappingForm`/`toCloMappingPayload` round-trip the ID arrays.
- **Manual**: seed, open a course spec, §15 shows seeded checkboxes + CLO descriptions; tick,
  add a new method, Save, reload → selections and the new method persist and appear for other
  courses.

## Risks / notes

- Method names are matched case-sensitively for uniqueness; "Lecture" and "lecture" would be
  two rows. Acceptable for foundation; can normalise later if the list gets noisy.
- No pagination on `GET /api/methods` — the vocabulary is small; revisit only if it grows large.
- Removing the free-text fields means any old §15 prose is dropped on next save; this is
  intended (demo data only).
