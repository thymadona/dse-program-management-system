import { cn } from "../lib/cn.ts";

export interface CompletionRingProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

/** Circular completion indicator (SVG donut) — used by Course Completeness cards. */
export function CompletionRing({
  value,
  size = 140,
  strokeWidth = 14,
  label = "Complete",
  className,
}: CompletionRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--status-live)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{clamped}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
