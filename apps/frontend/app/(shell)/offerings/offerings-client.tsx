"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import type { Lecturer, OfferingView, Student } from "@dse-pms/shared-types";
import { semesterLabel } from "@dse-pms/shared-types";
import {
  DataTable,
  StatusBadge,
  TableToolbar,
  type DataTableColumn,
} from "@dse-pms/ui";
import { coursesApi, type CourseView } from "@/lib/courses";
import { lecturersApi } from "@/lib/lecturers";
import { offeringsApi, offeringTone } from "@/lib/offerings";
import { studentsApi } from "@/lib/students";
import { ApiError } from "@/lib/api";
import { OfferingForm, type OfferingFormValues } from "./offering-form";
import { EnrollmentDialog } from "./enrollment-dialog";

export function OfferingsClient() {
  const [rows, setRows] = useState<OfferingView[]>([]);
  const [courses, setCourses] = useState<CourseView[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OfferingView | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [manage, setManage] = useState<OfferingView | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await offeringsApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load offerings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reference data for the form + enrollment dialog.
  useEffect(() => {
    coursesApi.list().then(setCourses).catch(() => setCourses([]));
    lecturersApi.list().then(setLecturers).catch(() => setLecturers([]));
    studentsApi.list({}).then(setStudents).catch(() => setStudents([]));
  }, []);

  const handleSubmit = async (values: OfferingFormValues) => {
    setSubmitting(true);
    try {
      if (editing) {
        const { courseId: _courseId, ...rest } = values;
        await offeringsApi.update(editing.id, rest);
      } else {
        await offeringsApi.create(values);
      }
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save offering");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (offering: OfferingView) => {
    if (!confirm(`Delete ${offering.course?.code} · ${offering.term}?`)) return;
    try {
      await offeringsApi.remove(offering.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete offering");
    }
  };

  // When enrollment changes, patch the row in place and keep the dialog in sync.
  const applyUpdate = (updated: OfferingView) => {
    setRows((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
    setManage((m) => (m && m.id === updated.id ? updated : m));
  };

  const columns: DataTableColumn<OfferingView>[] = [
    {
      key: "course",
      header: "Course",
      render: (o) =>
        o.course ? (
          <span>
            <span className="font-medium">{o.course.code}</span>{" "}
            <span className="text-muted-foreground">{o.course.title}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: "term", header: "Term", render: (o) => o.term },
    {
      key: "availability",
      header: "Availability",
      render: (o) =>
        o.semester || o.programmeYear != null ? (
          <span className="text-muted-foreground">
            {o.programmeYear != null ? `Year ${o.programmeYear}` : ""}
            {o.programmeYear != null && o.semester ? " · " : ""}
            {o.semester ? semesterLabel(o.semester) : ""}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "lecturer",
      header: "Lecturer",
      render: (o) =>
        o.lecturer ? (
          <StatusBadge tone="tournament" label={o.lecturer.name} icon={false} />
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "capacity",
      header: "Enrolled",
      render: (o) => (
        <span className={o.enrolledCount >= o.capacity ? "text-status-upcoming" : undefined}>
          {o.enrolledCount}/{o.capacity}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge tone={offeringTone(o.status)} label={o.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <TableToolbar
        search=""
        onSearchChange={() => {}}
        searchPlaceholder="Offerings"
        addLabel="Add Offering"
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
        getRowId={(o) => o.id}
        dragHandle
        actions={[
          {
            key: "manage",
            label: "Manage",
            icon: <Users className="mr-1 h-3.5 w-3.5" />,
            onClick: (o) => setManage(o),
          },
        ]}
        onEdit={(o) => {
          setEditing(o);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
        loading={loading}
        emptyMessage="No offerings yet. Add one to link a course, lecturer and students for a term."
      />

      <OfferingForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        courses={courses}
        lecturers={lecturers}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      <EnrollmentDialog
        open={manage !== null}
        onOpenChange={(o) => {
          if (!o) setManage(null);
        }}
        offering={manage}
        students={students}
        onChanged={applyUpdate}
      />
    </div>
  );
}
