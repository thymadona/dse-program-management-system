"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lecturer } from "@dse-pms/shared-types";
import { DataTable, StatusBadge, TableToolbar, type DataTableColumn } from "@dse-pms/ui";
import { coursesApi, type CourseView } from "@/lib/courses";
import { lecturersApi } from "@/lib/lecturers";
import { ApiError } from "@/lib/api";
import { CourseForm, type CourseFormValues } from "./course-form";

export function CoursesClient() {
  const [rows, setRows] = useState<CourseView[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseView | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await coursesApi.list(search));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  // Lecturers for the assign dropdown (loaded once).
  useEffect(() => {
    lecturersApi.list().then(setLecturers).catch(() => setLecturers([]));
  }, []);

  const handleSubmit = async (values: CourseFormValues) => {
    setSubmitting(true);
    try {
      if (editing) await coursesApi.update(editing.id, values);
      else await coursesApi.create(values);
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (course: CourseView) => {
    if (!confirm(`Delete ${course.code}?`)) return;
    try {
      await coursesApi.remove(course.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete course");
    }
  };

  const columns: DataTableColumn<CourseView>[] = [
    { key: "code", header: "Code", render: (c) => <span className="font-medium">{c.code}</span> },
    { key: "title", header: "Title", render: (c) => c.title },
    {
      key: "lecturer",
      header: "Lecturer",
      render: (c) =>
        c.lecturer ? (
          <StatusBadge tone="tournament" label={c.lecturer.name} icon={false} />
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courses…"
        addLabel="Add Course"
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
        getRowId={(c) => c.id}
        dragHandle
        onEdit={(c) => {
          setEditing(c);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="No courses yet. Add your first course."
      />

      <CourseForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        lecturers={lecturers}
        onSubmit={handleSubmit}
        submitting={submitting}
      />
    </div>
  );
}
