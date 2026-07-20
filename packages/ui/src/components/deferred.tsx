import * as React from "react";
import { cn } from "../lib/cn.ts";

/**
 * Placeholder stubs for components that belong to the Offerings plugin (built in
 * a later pass). They are exported now so the ui package's public API is stable
 * and pages can reference them without breaking when the real versions land.
 */
function Placeholder({ title, className }: { title: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground",
        className,
      )}
    >
      {title} — coming with the Offerings plugin
    </div>
  );
}

export function GanttChart({ className }: { className?: string }) {
  return <Placeholder title="Gantt Chart" className={className} />;
}

export function ResourceTable({ className }: { className?: string }) {
  return <Placeholder title="Resource Allocation" className={className} />;
}

export function MilestoneList({ className }: { className?: string }) {
  return <Placeholder title="Milestones" className={className} />;
}
