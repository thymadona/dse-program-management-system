"use client";

import { useEffect, useState } from "react";
import type { Lecturer } from "@dse-pms/shared-types";
import { DataTable, StatusBadge, type DataTableColumn } from "@dse-pms/ui";
import { lecturersApi } from "@/lib/lecturers";
import { ApiError } from "@/lib/api";

export function LecturersClient() {
  const [rows, setRows] = useState<Lecturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lecturersApi
      .list()
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load lecturers"))
      .finally(() => setLoading(false));
  }, []);

  const columns: DataTableColumn<Lecturer>[] = [
    { key: "name", header: "Name", render: (l) => <span className="font-medium">{l.name}</span> },
    { key: "email", header: "Email", render: (l) => l.email },
    {
      key: "role",
      header: "Role",
      render: () => <StatusBadge tone="tournament" label="Lecturer" icon={false} />,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Read-only — lecturers are Users with the <code className="text-foreground">lecturer</code>{" "}
        role, surfaced through the registry so Courses and Offerings can reference them.
      </p>
      {error ? (
        <div className="rounded-lg border border-status-upcoming bg-status-upcoming-bg px-4 py-2 text-sm text-status-upcoming">
          {error}
        </div>
      ) : null}
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(l) => l.id}
        loading={loading}
        emptyMessage="No lecturers found."
      />
    </div>
  );
}
