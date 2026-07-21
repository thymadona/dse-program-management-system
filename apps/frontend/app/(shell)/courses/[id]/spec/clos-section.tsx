"use client";

import {
  AFFECTIVE_LEVELS,
  COGNITIVE_LEVELS,
  PLOS,
  PSYCHOMOTOR_LEVELS,
} from "@dse-pms/shared-types";
import { Button } from "@dse-pms/ui";
import { ReferenceGuide } from "./reference-guide";

/** A CLO row held as strings for input binding; converted on save by the wizard. */
export type CloForm = {
  code: string;
  description: string;
  ploId: string;
  level: string;
};

export const EMPTY_CLOS: CloForm[] = [];

/** Assign CLO codes by position so they stay sequential after add/remove. */
function withCodes(items: CloForm[]): CloForm[] {
  return items.map((item, i) => ({ ...item, code: `CLO${i + 1}` }));
}

/** Map the API's §14 payload into the string-based form model. */
export function toClosForm(data: unknown): CloForm[] {
  const items = (data as { items?: unknown[] } | undefined)?.items ?? [];
  const str = (v: unknown) => (v == null ? "" : String(v));
  return withCodes(
    items.map((raw) => {
      const d = (raw ?? {}) as Record<string, unknown>;
      return {
        code: str(d.code),
        description: str(d.description),
        ploId: str(d.ploId),
        level: str(d.level),
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
      ploId: f.ploId || null,
      level: f.level || null,
    })),
  };
}

export function ClosSection({
  value,
  onChange,
}: {
  value: CloForm[];
  onChange: (items: CloForm[]) => void;
}) {
  const items = withCodes(value);

  const update = (index: number, patch: Partial<CloForm>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };
  const add = () => onChange([...items, { code: "", description: "", ploId: "", level: "" }]);
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        List what students will be able to do by the end of the course. Each CLO targets one
        programme learning outcome (PLO) and sits at one Bloom level in the Cognitive (C), Affective
        (A), or Psychomotor (P) domain.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <ReferenceGuide title="Cognitive (C1–C6)" rows={[...COGNITIVE_LEVELS]} />
        <ReferenceGuide title="Affective (A1–A5)" rows={[...AFFECTIVE_LEVELS]} />
        <ReferenceGuide title="Psychomotor (P1–P7)" rows={[...PSYCHOMOTOR_LEVELS]} />
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No learning outcomes yet. Add the first one to get started.
          </p>
        ) : null}

        {items.map((item, i) => (
          <fieldset key={i} className="space-y-3 rounded-lg border border-border p-4">
            <legend className="flex items-center gap-2 px-1">
              <span className="text-sm font-semibold text-foreground">{item.code}</span>
            </legend>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-foreground">Description</span>
              <textarea
                className="min-h-[72px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                placeholder="Students will be able to…"
                value={item.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">Primary PLO</span>
                <LevelSelect value={item.ploId} onChange={(v) => update(i, { ploId: v })}>
                  <option value="">— Select PLO —</option>
                  {PLOS.map((plo) => (
                    <option key={plo.id} value={plo.id} title={plo.description}>
                      {plo.id} — {plo.description.slice(0, 48)}
                      {plo.description.length > 48 ? "…" : ""}
                    </option>
                  ))}
                </LevelSelect>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-foreground">C/A/P Level</span>
                <LevelSelect value={item.level} onChange={(v) => update(i, { level: v })}>
                  <option value="">— Select level —</option>
                  <optgroup label="Cognitive">
                    {COGNITIVE_LEVELS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Affective">
                    {AFFECTIVE_LEVELS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Psychomotor">
                    {PSYCHOMOTOR_LEVELS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </optgroup>
                </LevelSelect>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-muted-foreground hover:text-status-live"
              >
                Remove {item.code}
              </button>
            </div>
          </fieldset>
        ))}
      </div>

      <Button variant="outline" onClick={add}>
        + Add learning outcome
      </Button>
    </div>
  );
}

function LevelSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {children}
    </select>
  );
}
