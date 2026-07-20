import * as React from "react";
import { Radio, CalendarClock, Trophy, Link2 } from "lucide-react";
import { cn } from "../lib/cn.ts";

/**
 * Semantic status tag from the Noviq design system.
 *  - live/active/success → green
 *  - upcoming/pending    → orange
 *  - tournament/category → purple
 *  - link/neutral        → gray
 */
export type StatusTone = "live" | "upcoming" | "tournament" | "neutral";

const toneStyles: Record<StatusTone, string> = {
  live: "bg-status-live-bg text-status-live",
  upcoming: "bg-status-upcoming-bg text-status-upcoming",
  tournament: "bg-status-tournament-bg text-status-tournament",
  neutral: "bg-status-neutral-bg text-status-neutral",
};

const toneIcons: Record<StatusTone, React.ComponentType<{ className?: string }>> = {
  live: Radio,
  upcoming: CalendarClock,
  tournament: Trophy,
  neutral: Link2,
};

export interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  icon?: boolean;
  className?: string;
}

export function StatusBadge({ tone, label, icon = true, className }: StatusBadgeProps) {
  const Icon = toneIcons[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {icon ? <Icon className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}
