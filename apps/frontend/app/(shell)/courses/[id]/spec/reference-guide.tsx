"use client";

import { useState } from "react";

/**
 * Collapsible reference callout — renders a small guide table (e.g. the Bloom
 * Cognitive/Affective/Psychomotor level lists) beside the fields that use them.
 * Wired in Phase 1, reused by later phases (§14/§15 CLO levels, §16 SLT legend…).
 */
export function ReferenceGuide({
  title,
  rows,
  defaultOpen = false,
}: {
  title: string;
  rows: { code: string; name: string; hint?: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-foreground"
      >
        <span>{title}</span>
        <span className="text-muted-foreground">{open ? "–" : "+"}</span>
      </button>
      {open ? (
        <dl className="grid gap-1 border-t border-border px-3 py-2 text-xs">
          {rows.map((r) => (
            <div key={r.code} className="flex gap-2">
              <dt className="w-8 shrink-0 font-mono font-semibold text-foreground">{r.code}</dt>
              <dd className="text-muted-foreground">
                <span className="text-foreground">{r.name}</span>
                {r.hint ? ` — ${r.hint}` : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
