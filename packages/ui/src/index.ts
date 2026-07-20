// Utilities
export { cn } from "./lib/cn.ts";

// Primitives
export { Button, type ButtonProps } from "./primitives/button.tsx";
export { Input } from "./primitives/input.tsx";
export { Switch } from "./primitives/switch.tsx";
export { Checkbox } from "./primitives/checkbox.tsx";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./primitives/dialog.tsx";

// Composed components
export { StatusBadge, type StatusTone, type StatusBadgeProps } from "./components/status-badge.tsx";
export { TableToolbar, type TableToolbarProps } from "./components/table-toolbar.tsx";
export {
  DataTable,
  type DataTableProps,
  type DataTableColumn,
  type DataTableAction,
} from "./components/data-table.tsx";

// Deferred (Offerings plugin) — stable API, placeholder implementations
export { GanttChart, ResourceTable, MilestoneList } from "./components/deferred.tsx";
