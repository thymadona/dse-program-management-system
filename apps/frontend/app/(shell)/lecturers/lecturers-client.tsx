"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lecturer } from "@dse-pms/shared-types";
import { DataTable, StatusBadge, TableToolbar, type DataTableColumn } from "@dse-pms/ui";
import { lecturersApi } from "@/lib/lecturers";
import { ApiError } from "@/lib/api";
import { LecturerForm, type LecturerFormValues } from "./lecturer-form";

export function LecturersClient() {
  const [rows, setRows] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lecturer | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await lecturersApi.list(search));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load lecturers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const handleSubmit = async (values: LecturerFormValues) => {
    setSubmitting(true);
    try {
      if (editing) await lecturersApi.update(editing.id, values);
      else await lecturersApi.create(values);
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save lecturer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (lecturer: Lecturer) => {
    if (!confirm(`Delete ${lecturer.name}?`)) return;
    try {
      await lecturersApi.remove(lecturer.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete lecturer");
    }
  };

  const columns: DataTableColumn<Lecturer>[] = [
    {
      key: "name",
      header: "Name",
      render: (l) => (
        <span className="font-medium">
          {l.title ? `${l.title} ` : ""}
          {l.name}
        </span>
      ),
    },
    { key: "email", header: "Email", render: (l) => l.email },
    {
      key: "qualification",
      header: "Qualification",
      render: (l) =>
        l.qualification ? l.qualification : <span className="text-muted-foreground">—</span>,
    },
    {
      key: "phone",
      header: "Telephone",
      render: (l) => (l.phone ? l.phone : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "role",
      header: "Role",
      render: () => <StatusBadge tone="tournament" label="Lecturer" icon={false} />,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Lecturers are Users with the <code className="text-foreground">lecturer</code> role. Their
        qualification and telephone auto-fill the instructor block on course syllabi.
      </p>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lecturers…"
        addLabel="Add Lecturer"
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      />

      {error ? (
        <div className="rounded-lg border border-status-upcoming bg-status-upcoming-bg px-4 py-2 text-sm text-status-upcoming">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(l) => l.id}
        onEdit={(l) => {
          setEditing(l);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="No lecturers yet. Add your first lecturer."
      />

      <LecturerForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
