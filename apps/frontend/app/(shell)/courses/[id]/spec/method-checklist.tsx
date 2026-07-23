"use client";

import type { Method } from "@dse-pms/shared-types";

/**
 * A multi-select checkbox list for a §14 CLO method field. Shows a ticked-count
 * badge and one checkbox per known method.
 */
export function MethodChecklist({
  label,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  options: Method[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedIds);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
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
      </ul>
    </div>
  );
}
