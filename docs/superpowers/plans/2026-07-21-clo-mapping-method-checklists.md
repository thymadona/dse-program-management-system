# §15 Method Checklists + Shared Method Vocabulary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the §15 free-text teaching/assessment method fields with checkbox lists backed by two seeded, shared method-vocabulary tables that grow as lecturers add methods, and show each CLO's description in its mapping card.

**Architecture:** Two new global Prisma tables (`TeachingMethod`, `AssessmentMethod`) hold the vocabulary. A new `methods` backend plugin exposes read + add endpoints. The §15 form loads the vocabulary once, renders a `MethodChecklist` per field, and stores ticked selections as method IDs inside the existing `CourseSpec.data.cloMapping` JSON document.

**Tech Stack:** Bun, TypeScript, Express, Prisma (PostgreSQL), Zod, Next.js (App Router), React, Tailwind. Monorepo via Turbo; shared contracts in `@dse-pms/shared-types`.

## Global Constraints

- Package manager / runtime: **Bun 1.2.23**. Run scripts with `bun run …`.
- Backend imports use explicit `.ts` extensions (e.g. `./service.ts`) — match existing files.
- Every backend route requires auth; reads use `:read` permission, writes use `:write`.
- Shared contracts live in `@dse-pms/shared-types` and are imported by both apps — never duplicate types across apps.
- Follow the existing plugin pattern exactly (students/courses): `index.ts` + `router.ts` + `service.ts`, manifest in `packages/shared-types/src/plugins.ts`, registered in `apps/backend/src/core/app.ts`.
- Tailwind design tokens in use: `border-border`, `bg-card`, `text-foreground`, `text-muted-foreground`, `ring-accent`. Reuse them; do not introduce raw colors.
- Automated gates: `bun test <file>` for pure logic, `bun run typecheck` (root, turbo) for types. There is no frontend test runner — the frontend is gated by typecheck + manual check.
- Work on branch `feat/clo-mapping-method-checklists` (already created). Commit after each task.

---

### Task 1: Shared types — method contracts + §15 schema change

**Files:**
- Create: `packages/shared-types/src/methods.ts`
- Create: `packages/shared-types/src/course-spec.test.ts`
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/src/plugins.ts` (add `methodsManifest`, append to `pluginManifests`)
- Modify: `packages/shared-types/src/course-spec.ts` (`CloMappingItem`)

**Interfaces:**
- Produces: `Method = { id: string; name: string }`; `MethodKind = "teaching" | "assessment"`; `CreateMethodInput` (Zod, `{ name }` trimmed, min 1); `MethodsResponse = { teaching: Method[]; assessment: Method[] }`; `methodsManifest: PluginManifest`. `CloMappingItem` now has `teachingMethodIds: string[]` and `assessmentMethodIds: string[]` (default `[]`), and no longer has `teachingMethod`/`assessmentMethod`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared-types/src/course-spec.test.ts`:

```ts
import { expect, test } from "bun:test";
import { CloMappingItem } from "./course-spec.ts";
import { CreateMethodInput } from "./methods.ts";

test("CloMappingItem defaults method id arrays to []", () => {
  const parsed = CloMappingItem.parse({ cloCode: "CLO1" });
  expect(parsed.teachingMethodIds).toEqual([]);
  expect(parsed.assessmentMethodIds).toEqual([]);
});

test("CloMappingItem preserves provided method ids", () => {
  const parsed = CloMappingItem.parse({
    cloCode: "CLO1",
    teachingMethodIds: ["a", "b"],
    assessmentMethodIds: ["c"],
  });
  expect(parsed.teachingMethodIds).toEqual(["a", "b"]);
  expect(parsed.assessmentMethodIds).toEqual(["c"]);
});

test("CreateMethodInput trims name and rejects blank", () => {
  expect(CreateMethodInput.parse({ name: "  Lecture  " }).name).toBe("Lecture");
  expect(CreateMethodInput.safeParse({ name: "   " }).success).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared-types/src/course-spec.test.ts`
Expected: FAIL — `methods.ts` does not exist / `CloMappingItem` has no `teachingMethodIds`.

- [ ] **Step 3: Create `packages/shared-types/src/methods.ts`**

```ts
import { z } from "zod";

/** A method vocabulary entry as returned to the client. */
export const MethodSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type Method = z.infer<typeof MethodSchema>;

/** Which §15 vocabulary a method belongs to. Also the POST route segment. */
export type MethodKind = "teaching" | "assessment";

/** Body for adding a method: trimmed, non-empty. */
export const CreateMethodInput = z.object({
  name: z.string().trim().min(1, "Method name is required"),
});
export type CreateMethodInput = z.infer<typeof CreateMethodInput>;

/** GET /api/methods response — both vocabularies in one payload. */
export const MethodsResponse = z.object({
  teaching: z.array(MethodSchema),
  assessment: z.array(MethodSchema),
});
export type MethodsResponse = z.infer<typeof MethodsResponse>;
```

- [ ] **Step 4: Add `methodsManifest` in `packages/shared-types/src/plugins.ts`**

After the `lecturersManifest` block (before `pluginManifests`), add:

```ts
export const methodsManifest: PluginManifest = {
  id: "methods",
  name: "Methods",
  version: "0.1.0",
  description: "Teaching & assessment method vocabulary for course specs (§15).",
  permissions: ["methods:read", "methods:write"],
};
```

Then append it to the `pluginManifests` array:

```ts
export const pluginManifests: PluginManifest[] = [
  studentsManifest,
  coursesManifest,
  offeringsManifest,
  lecturersManifest,
  methodsManifest,
];
```

(`methodsManifest` has no `routes`, so it contributes nothing to the sidebar — intended.)

- [ ] **Step 5: Change `CloMappingItem` in `packages/shared-types/src/course-spec.ts`**

Replace the `teachingMethod` / `assessmentMethod` lines inside `CloMappingItem`:

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

- [ ] **Step 6: Export the new module from `packages/shared-types/src/index.ts`**

Add a line after the `course-spec.ts` export:

```ts
export * from "./methods.ts";
```

- [ ] **Step 7: Run test to verify it passes**

Run: `bun test packages/shared-types/src/course-spec.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Typecheck**

Run: `bun run typecheck`
Expected: PASS. (If it fails, it will be in `clo-mapping-section.tsx` referencing the removed string fields — that file is rewritten in Task 5; if the failure is only there, note it and continue; all other packages must pass.)

- [ ] **Step 9: Commit**

```bash
git add packages/shared-types/src/methods.ts packages/shared-types/src/course-spec.test.ts packages/shared-types/src/index.ts packages/shared-types/src/plugins.ts packages/shared-types/src/course-spec.ts
git commit -m "feat(types): add method vocabulary contracts + §15 method-id fields"
```

---

### Task 2: Prisma models, migration, and seed

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_add_method_vocabulary/migration.sql` (generated)
- Modify: `apps/backend/prisma/seed.ts`

**Interfaces:**
- Produces: Prisma models `TeachingMethod { id, name @unique, createdAt }` and `AssessmentMethod { id, name @unique, createdAt }`, plus a generated client exposing `prisma.teachingMethod` / `prisma.assessmentMethod`.

- [ ] **Step 1: Add models to `apps/backend/prisma/schema.prisma`**

Append at the end of the file:

```prisma
/// §15 teaching-method vocabulary. Global and shared across all courses; grows
/// as lecturers add methods from the course-spec form. Names are unique so an
/// add of an existing name reuses the row.
model TeachingMethod {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
}

/// §15 assessment-method vocabulary. Same lifecycle as TeachingMethod.
model AssessmentMethod {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Ensure the dev database is running**

Run: `bun run db:up`
Expected: docker compose starts Postgres (or reports it already running).

- [ ] **Step 3: Create and apply the migration**

Run: `bun run --cwd apps/backend db:migrate --name add_method_vocabulary`
Expected: Prisma creates `..._add_method_vocabulary/migration.sql`, applies it, and regenerates the client. The SQL should `CREATE TABLE "TeachingMethod"` and `"AssessmentMethod"` with a unique index on `name`.

- [ ] **Step 4: Add seed data in `apps/backend/prisma/seed.ts`**

Near the top, after the `courses` array, add:

```ts
const teachingMethods = [
  "Lecture", "Guided Hands-on Lab", "Demonstration", "Lab-based Learning",
  "Step-by-step Coding", "Scaffolded Exercises", "Tutoring", "Practice",
  "Case Study", "Seminar", "Team-based Learning", "Project-Based Learning",
  "Presentation", "Flipped Classroom", "Group Discussion",
];

const assessmentMethods = [
  "Assignment", "Mid-term Quiz", "Final Exam", "Quiz", "Lab Report",
  "Project", "Presentation & Defence", "Peer Review", "Reflection Journal",
];
```

Inside `main()`, after the students `for` loop and before the courses loop, add:

```ts
  for (const name of teachingMethods) {
    await prisma.teachingMethod.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of assessmentMethods) {
    await prisma.assessmentMethod.upsert({ where: { name }, update: {}, create: { name } });
  }
```

Update the final `console.log` to mention methods:

```ts
  console.log(
    `Seeded ${users.length} users, ${students.length} students, ${courses.length} courses, ` +
      `${teachingMethods.length} teaching + ${assessmentMethods.length} assessment methods, 1 offering.`,
  );
```

- [ ] **Step 5: Run the seed**

Run: `bun run seed`
Expected: log line reporting `15 teaching + 9 assessment methods`. Re-running is idempotent (upsert by name).

- [ ] **Step 6: Verify the rows exist**

Run: `bun run --cwd apps/backend db:generate` (no-op if already generated), then verify via a quick query:

```bash
cd apps/backend && bun -e "import{PrismaClient}from'@prisma/client';const p=new PrismaClient();console.log(await p.teachingMethod.count(),await p.assessmentMethod.count());await p.\$disconnect();"
```
Expected: prints `15 9`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations apps/backend/prisma/seed.ts
git commit -m "feat(db): add TeachingMethod/AssessmentMethod tables + seed vocabulary"
```

---

### Task 3: `methods` backend plugin + wiring + permissions

**Files:**
- Create: `apps/backend/src/plugins/methods/service.ts`
- Create: `apps/backend/src/plugins/methods/router.ts`
- Create: `apps/backend/src/plugins/methods/index.ts`
- Modify: `apps/backend/src/core/app.ts` (register plugin)
- Modify: `apps/backend/src/core/permissions/index.ts` (add `methods:*`)

**Interfaces:**
- Consumes: `CreateMethodInput`, `Method`, `MethodsResponse`, `methodsManifest` (Task 1); `prisma` from `../../core/db/prisma.ts`; `BackendPlugin` from `../../core/plugins/registry.ts`.
- Produces: `methodService` with `list(): Promise<MethodsResponse>`, `addTeaching(input): Promise<{ method: Method; created: boolean }>`, `addAssessment(input): Promise<{ method: Method; created: boolean }>`; `methodsPlugin`; routes `GET /api/methods`, `POST /api/methods/teaching`, `POST /api/methods/assessment`.

- [ ] **Step 1: Create `apps/backend/src/plugins/methods/service.ts`**

```ts
import type { CreateMethodInput, Method, MethodsResponse } from "@dse-pms/shared-types";
import { prisma } from "../../core/db/prisma.ts";

/**
 * Method vocabulary business logic. Two global reference tables read by the §15
 * course-spec form. Adding a method is idempotent on `name`: an existing name
 * returns the existing row (created=false) rather than erroring.
 */
export const methodService = {
  async list(): Promise<MethodsResponse> {
    const select = { id: true, name: true } as const;
    const [teaching, assessment] = await Promise.all([
      prisma.teachingMethod.findMany({ orderBy: { name: "asc" }, select }),
      prisma.assessmentMethod.findMany({ orderBy: { name: "asc" }, select }),
    ]);
    return { teaching, assessment };
  },

  async addTeaching(input: CreateMethodInput): Promise<{ method: Method; created: boolean }> {
    const select = { id: true, name: true } as const;
    const existing = await prisma.teachingMethod.findUnique({ where: { name: input.name }, select });
    if (existing) return { method: existing, created: false };
    const method = await prisma.teachingMethod.create({ data: { name: input.name }, select });
    return { method, created: true };
  },

  async addAssessment(input: CreateMethodInput): Promise<{ method: Method; created: boolean }> {
    const select = { id: true, name: true } as const;
    const existing = await prisma.assessmentMethod.findUnique({ where: { name: input.name }, select });
    if (existing) return { method: existing, created: false };
    const method = await prisma.assessmentMethod.create({ data: { name: input.name }, select });
    return { method, created: true };
  },
};

export type MethodService = typeof methodService;
```

- [ ] **Step 2: Create `apps/backend/src/plugins/methods/router.ts`**

```ts
import { Router } from "express";
import { CreateMethodInput } from "@dse-pms/shared-types";
import { requireAuth } from "../../core/auth/middleware.ts";
import { requirePermission } from "../../core/permissions/index.ts";
import { methodService } from "./service.ts";

/**
 * Methods REST router. Reads need `methods:read`, adds need `methods:write`.
 * POST is idempotent on name: 201 when created, 200 when the name already existed.
 */
export function createMethodRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", requirePermission("methods:read"), async (_req, res) => {
    res.json(await methodService.list());
  });

  router.post("/teaching", requirePermission("methods:write"), async (req, res) => {
    const parsed = CreateMethodInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const { method, created } = await methodService.addTeaching(parsed.data);
    res.status(created ? 201 : 200).json(method);
  });

  router.post("/assessment", requirePermission("methods:write"), async (req, res) => {
    const parsed = CreateMethodInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    const { method, created } = await methodService.addAssessment(parsed.data);
    res.status(created ? 201 : 200).json(method);
  });

  return router;
}
```

- [ ] **Step 3: Create `apps/backend/src/plugins/methods/index.ts`**

```ts
import { methodsManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createMethodRouter } from "./router.ts";
import { methodService, type MethodService } from "./service.ts";

/** Methods plugin: shared manifest + Express router + public service. */
export const methodsPlugin: BackendPlugin<MethodService> = {
  manifest: methodsManifest,
  router: createMethodRouter(),
  service: methodService,
};
```

- [ ] **Step 4: Register the plugin in `apps/backend/src/core/app.ts`**

Add the import alongside the others:

```ts
import { methodsPlugin } from "../plugins/methods/index.ts";
```

Add the registration after `registry.register(offeringsPlugin);`:

```ts
  registry.register(methodsPlugin);
```

- [ ] **Step 5: Add permissions in `apps/backend/src/core/permissions/index.ts`**

Add `"methods:read"` and `"methods:write"` to `admin`; `"methods:read"` and `"methods:write"` to `lecturer`; `"methods:read"` to `student`. The map becomes:

```ts
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "students:read", "students:write",
    "courses:read", "courses:write",
    "offerings:read", "offerings:write",
    "lecturers:read", "lecturers:write",
    "methods:read", "methods:write",
  ],
  lecturer: [
    "students:read",
    "courses:read", "courses:write",
    "offerings:read", "offerings:write",
    "lecturers:read", "lecturers:write",
    "methods:read", "methods:write",
  ],
  student: ["students:read", "courses:read", "offerings:read", "lecturers:read", "methods:read"],
};
```

- [ ] **Step 6: Typecheck**

Run: `bun run typecheck`
Expected: PASS for backend + shared-types (the frontend `clo-mapping-section.tsx` may still error until Task 5 — acceptable at this step if that is the only failure).

- [ ] **Step 7: Manual API verification**

Start the backend and mint a dev token:

```bash
TOKEN=$(bun run gen-token | tail -n1)
bun run --cwd apps/backend dev &   # or: bun run dev at repo root
sleep 2
curl -s localhost:4000/api/methods -H "Authorization: Bearer $TOKEN" | head -c 400; echo
curl -s -X POST localhost:4000/api/methods/teaching -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Flipped Classroom"}' -w "\nHTTP %{http_code}\n"
curl -s -X POST localhost:4000/api/methods/teaching -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Studio Critique"}' -w "\nHTTP %{http_code}\n"
```

Expected: GET returns `{"teaching":[…],"assessment":[…]}`. The "Flipped Classroom" POST returns `HTTP 200` (already seeded); "Studio Critique" returns `HTTP 201`. Stop the dev server afterward (`kill %1`).

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/plugins/methods apps/backend/src/core/app.ts apps/backend/src/core/permissions/index.ts
git commit -m "feat(api): add methods plugin (list + add) with methods:* permissions"
```

---

### Task 4: Frontend API client + `MethodChecklist` component

**Files:**
- Create: `apps/frontend/lib/methods.ts`
- Create: `apps/frontend/app/(shell)/courses/[id]/spec/method-checklist.tsx`

**Interfaces:**
- Consumes: `Method`, `MethodKind`, `MethodsResponse` (Task 1); `api` from `@/lib/api`.
- Produces: `methodsApi.list(): Promise<MethodsResponse>`, `methodsApi.add(kind, name): Promise<Method>`; `MethodChecklist` component with props `{ label: string; options: Method[]; selectedIds: string[]; onChange: (ids: string[]) => void; onAdd: (name: string) => Promise<Method> }`.

- [ ] **Step 1: Create `apps/frontend/lib/methods.ts`**

```ts
import type { Method, MethodKind, MethodsResponse } from "@dse-pms/shared-types";
import { api } from "./api";

/** Client for the §15 method vocabulary endpoints (methods plugin). */
export const methodsApi = {
  list(): Promise<MethodsResponse> {
    return api.get<MethodsResponse>("/api/methods");
  },
  add(kind: MethodKind, name: string): Promise<Method> {
    return api.post<Method>(`/api/methods/${kind}`, { name });
  },
};
```

- [ ] **Step 2: Create `apps/frontend/app/(shell)/courses/[id]/spec/method-checklist.tsx`**

```tsx
"use client";

import { useState } from "react";
import type { Method } from "@dse-pms/shared-types";

/**
 * A multi-select checkbox list for a §15 method field. Shows a ticked-count
 * badge, one checkbox per known method, and an inline "+ Add method" input that
 * persists a new method (via onAdd) and ticks it.
 */
export function MethodChecklist({
  label,
  options,
  selectedIds,
  onChange,
  onAdd,
}: {
  label: string;
  options: Method[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onAdd: (name: string) => Promise<Method>;
}) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const selected = new Set(selectedIds);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const add = async () => {
    const name = draft.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      const method = await onAdd(name);
      if (!selected.has(method.id)) onChange([...selectedIds, method.id]);
      setDraft("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label} <span className="text-muted-foreground">({selectedIds.length})</span>
      </span>
      <ul className="space-y-1 rounded-lg border border-border bg-card p-3">
        {options.map((m) => (
          <li key={m.id}>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                checked={selected.has(m.id)}
                onChange={() => toggle(m.id)}
              />
              {m.name}
            </label>
          </li>
        ))}
        <li className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="+ Add method"
            className="h-8 flex-1 rounded-lg border border-border bg-card px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || adding}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS for this new file and shared-types/backend (the not-yet-updated `clo-mapping-section.tsx` may still error until Task 5).

- [ ] **Step 4: Commit**

```bash
git add "apps/frontend/lib/methods.ts" "apps/frontend/app/(shell)/courses/[id]/spec/method-checklist.tsx"
git commit -m "feat(web): add methods API client + MethodChecklist component"
```

---

### Task 5: Wire §15 — CLO description + method checklists

**Files:**
- Modify: `apps/frontend/app/(shell)/courses/[id]/spec/clo-mapping-section.tsx`
- Modify: `apps/frontend/app/(shell)/courses/[id]/spec/spec-client.tsx`

**Interfaces:**
- Consumes: `MethodChecklist` (Task 4); `methodsApi` (Task 4); `Method`, `MethodKind` (Task 1); `CloForm` (existing, has `.description`).
- Produces: updated `CloMappingForm` with `teachingMethodIds: string[]` / `assessmentMethodIds: string[]`; `CloMappingSection` now takes `teachingMethods: Method[]`, `assessmentMethods: Method[]`, `onAddMethod: (kind: MethodKind, name: string) => Promise<Method>`.

- [ ] **Step 1: Rewrite the form model + mappers in `clo-mapping-section.tsx`**

Replace the top of the file (imports through `toCloMappingPayload`) with:

```tsx
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
```

- [ ] **Step 2: Update the `CloMappingSection` signature and body in `clo-mapping-section.tsx`**

Replace the `CloMappingSection` component (from `export function CloMappingSection({` to its closing `}`) with:

```tsx
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
```

- [ ] **Step 3: Load the vocabulary + add callback in `spec-client.tsx`**

Add imports near the existing lib imports:

```tsx
import type { Method, MethodKind } from "@dse-pms/shared-types";
import { methodsApi } from "@/lib/methods";
```

Add state next to the other `useState` calls:

```tsx
  const [teachingMethods, setTeachingMethods] = useState<Method[]>([]);
  const [assessmentMethods, setAssessmentMethods] = useState<Method[]>([]);
```

Inside `load`, after `setCloMapping(...)`, fetch the vocabulary:

```tsx
      const methods = await methodsApi.list();
      setTeachingMethods(methods.teaching);
      setAssessmentMethods(methods.assessment);
```

Add the add-method callback after `load` is defined (above the `useEffect`):

```tsx
  const sortByName = (list: Method[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  const handleAddMethod = useCallback(async (kind: MethodKind, name: string): Promise<Method> => {
    const method = await methodsApi.add(kind, name);
    const setter = kind === "teaching" ? setTeachingMethods : setAssessmentMethods;
    setter((list) => (list.some((m) => m.id === method.id) ? list : sortByName([...list, method])));
    return method;
  }, []);
```

- [ ] **Step 4: Pass the new props to `CloMappingSection` in `spec-client.tsx`**

Replace the existing render line:

```tsx
          ) : activeId === "cloMapping" ? (
            <CloMappingSection clos={clos} value={cloMapping} onChange={setCloMapping} />
```

with:

```tsx
          ) : activeId === "cloMapping" ? (
            <CloMappingSection
              clos={clos}
              value={cloMapping}
              onChange={setCloMapping}
              teachingMethods={teachingMethods}
              assessmentMethods={assessmentMethods}
              onAddMethod={handleAddMethod}
            />
```

- [ ] **Step 5: Typecheck**

Run: `bun run typecheck`
Expected: PASS across all packages (no remaining references to `teachingMethod`/`assessmentMethod` strings).

- [ ] **Step 6: Manual end-to-end verification**

Ensure DB is seeded (Task 2) and start both apps: `bun run dev`. In the browser:
1. Open a course → **Course Specification** → add a CLO in §14 (with a description, PLO, level) if none exists → Save.
2. Go to **§15 CLO → PLO Mapping & Methods**. Confirm: the CLO card shows its **description**; **Teaching method** and **Assessment method** render as checkbox lists of the seeded vocabulary, each with a `(0)` badge.
3. Tick two teaching methods (badge → `(2)`) and one assessment method. Use "+ Add method" to add a new one → it appears ticked and the badge increments.
4. Click **Save**, then reload the page. Confirm the ticks persist and the newly-added method is still present (and appears for other courses too).

Expected: all four checks pass.

- [ ] **Step 7: Commit**

```bash
git add "apps/frontend/app/(shell)/courses/[id]/spec/clo-mapping-section.tsx" "apps/frontend/app/(shell)/courses/[id]/spec/spec-client.tsx"
git commit -m "feat(web): §15 CLO description + teaching/assessment method checklists"
```

---

## Self-Review

**Spec coverage:**
- Two seeded global tables → Task 2. ✓
- `methods` plugin (GET + POST teaching/assessment, permissions) → Task 3. ✓
- §15 checkbox lists with count badge + "+ Add method" → Tasks 4 (component) + 5 (wiring). ✓
- CLO description shown read-only in each card → Task 5. ✓
- Selections stored as method IDs in the spec JSON → Task 1 (schema) + Task 5 (payload). ✓
- Shared-types contracts + manifest → Task 1. ✓
- Out-of-scope items (history, dashboard, admin CRUD, note field, selection table) → none introduced. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `teachingMethodIds`/`assessmentMethodIds` used identically in the Zod schema (Task 1), form model + payload (Task 5). `Method = { id, name }`, `MethodKind = "teaching" | "assessment"` consistent across Tasks 1/3/4/5. `methodService.addTeaching`/`addAssessment` return `{ method, created }` and the router maps `created` → 201/200 consistently. `onAddMethod(kind, name) => Promise<Method>` matches `MethodChecklist.onAdd(name) => Promise<Method>` via the `(name) => onAddMethod(kind, name)` adapter in Task 5. ✓

**Note on a known cross-task typecheck state:** Tasks 1, 3, and 4 each say the frontend `clo-mapping-section.tsx` may still fail typecheck until Task 5 rewrites it. This is expected and resolves at Task 5 Step 5. Only that one file may fail in the interim; any other typecheck failure indicates a real problem.
