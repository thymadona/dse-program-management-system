"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  rubricMaxLevelPoints,
  rubricScaleSummary,
  rubricTotalPoints,
  type Rubric,
} from "@dse-pms/shared-types";
import { Button, Input, StatusBadge } from "@dse-pms/ui";
import { ApiError } from "@/lib/api";
import { rubricsApi, rubricStatusTone, typeChipClass } from "@/lib/rubrics";

export function RubricsClient() {
  const [rows, setRows] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Rubric | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await rubricsApi.list({ search });
      setRows(list);
      // Keep the preview in sync with the freshest copy (or clear if it's gone).
      setSelected((prev) => (prev ? (list.find((r) => r.id === prev.id) ?? null) : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load rubrics");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const handleDelete = async (rubric: Rubric) => {
    if (!confirm(`Delete "${rubric.name}"? This cannot be undone.`)) return;
    try {
      await rubricsApi.remove(rubric.id);
      if (selected?.id === rubric.id) setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete rubric");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rubrics…"
            className="pl-9"
          />
        </div>
        <Button render={<Link href="/rubrics/new"><Plus className="h-4 w-4" />Create Rubric</Link>} />
      </div>

      {error ? (
        <div className="rounded-lg border border-status-live/40 bg-status-live/10 px-3 py-2 text-sm text-status-live">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* List */}
        <div className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Rubric Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Last Updated</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No rubrics yet. Create your first rubric.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    aria-selected={selected?.id === r.id}
                    className={`cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/50 aria-selected:bg-accent/10 ${
                      selected?.id === r.id ? "aria-selected:ring-1 aria-selected:ring-inset aria-selected:ring-accent/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.name}</div>
                      {r.description ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {r.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${typeChipClass(r.type)}`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.owner?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(r.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={rubricStatusTone(r.status)} label={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelected(r)}
                          aria-label={`Preview ${r.name}`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/rubrics/${r.id}/edit`}
                          aria-label={`Edit ${r.name}`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(r)}
                          aria-label={`Delete ${r.name}`}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-status-live-bg hover:text-status-live"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Preview panel */}
        {selected ? (
          <RubricPreview
            rubric={selected}
            onClose={() => setSelected(null)}
            onDelete={() => handleDelete(selected)}
          />
        ) : null}
      </div>
    </div>
  );
}

function RubricPreview({
  rubric,
  onClose,
  onDelete,
}: {
  rubric: Rubric;
  onClose: () => void;
  onDelete: () => void;
}) {
  const maxPoints = rubricMaxLevelPoints(rubric.levels);
  const total = rubricTotalPoints(rubric);

  return (
    <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-5 lg:w-[400px]">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Rubric Preview
        </h2>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">{rubric.name}</h3>
        <StatusBadge tone={rubricStatusTone(rubric.status)} label={rubric.status} />
      </div>
      {rubric.description ? (
        <p className="mt-1 text-sm text-muted-foreground">{rubric.description}</p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Meta label="Type">
          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${typeChipClass(rubric.type)}`}>
            {rubric.type}
          </span>
        </Meta>
        <Meta label="Last Updated">{formatDate(rubric.updatedAt)}</Meta>
        <Meta label="Created By">{rubric.owner?.name ?? "—"}</Meta>
        <Meta label="Total Criteria">{rubric.criteria.length}</Meta>
        <Meta label="Total Points">{total}</Meta>
      </dl>

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-foreground">Rubric Criteria</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Rating Scale: {rubricScaleSummary(rubric.levels)}
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40 text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Criteria</th>
                {rubric.levels.map((lvl, i) => (
                  <th key={i} className="px-2 py-2 text-center font-medium">
                    <div className="font-semibold text-foreground">{lvl.points}</div>
                    <div>{lvl.label}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {rubric.criteria.map((c, ci) => (
                <tr key={c.id} className="border-t border-border align-top">
                  <td className="px-2 py-2 font-medium text-foreground">
                    {ci + 1}. {c.name}
                  </td>
                  {rubric.levels.map((_lvl, li) => (
                    <td key={li} className="px-2 py-2 text-muted-foreground">
                      {c.descriptors[li] ?? "—"}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center text-muted-foreground">/{maxPoints}</td>
                </tr>
              ))}
              <tr className="border-t border-border bg-muted/30">
                <td
                  className="px-2 py-2 text-right font-medium text-foreground"
                  colSpan={rubric.levels.length + 1}
                >
                  Total
                </td>
                <td className="px-2 py-2 text-center font-semibold text-foreground">/{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" className="flex-1" render={
          <Link href={`/rubrics/${rubric.id}/edit`}><Pencil className="h-4 w-4" />Edit Rubric</Link>
        } />
        <Button variant="outline" onClick={onDelete} className="text-status-live hover:text-status-live">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </aside>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{children}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
