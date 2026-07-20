import * as React from "react";
import { Plus, Search } from "lucide-react";
import { cn } from "../lib/cn.ts";
import { Button } from "../primitives/button.tsx";
import { Input } from "../primitives/input.tsx";
import { Switch } from "../primitives/switch.tsx";

export interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /** Optional "See only active" toggle. */
  activeOnly?: boolean;
  onActiveOnlyChange?: (value: boolean) => void;
  activeOnlyLabel?: string;
  /** Optional "Add X" primary action. */
  addLabel?: string;
  onAdd?: () => void;
  className?: string;
}

/** Search + optional active-only toggle + optional "Add X" button row. */
export function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  activeOnly,
  onActiveOnlyChange,
  activeOnlyLabel = "See only active",
  addLabel,
  onAdd,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-4">
        {onActiveOnlyChange ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            {activeOnlyLabel}
            <Switch checked={activeOnly} onCheckedChange={onActiveOnlyChange} />
          </label>
        ) : null}
        {addLabel && onAdd ? (
          <Button onClick={onAdd} variant="accent">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
