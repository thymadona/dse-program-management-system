import { SidebarTrigger, StatusBadge } from "@dse-pms/ui";
import { ThemeToggle } from "./theme-toggle";
import { TopbarUser } from "./topbar-user";

export interface TopbarProps {
  title: string;
  subtitle?: string;
}

/** Page topbar: sidebar toggle + title + a "Live" status badge + current date. */
export function Topbar({ title, subtitle }: TopbarProps) {
  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <TopbarUser />
        <span>{date}</span>
        <StatusBadge tone="live" label="Live" />
        <ThemeToggle />
      </div>
    </header>
  );
}
