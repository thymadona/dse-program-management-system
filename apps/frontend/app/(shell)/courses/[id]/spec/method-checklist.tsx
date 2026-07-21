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
