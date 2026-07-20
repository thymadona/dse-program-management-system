"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavRoutes, iconMap } from "@/lib/nav";
import { cn } from "@dse-pms/ui";

/** Dark sidebar (#102A30). Nav items are generated from the plugin manifest. */
export function Sidebar() {
  const pathname = usePathname();
  const routes = getNavRoutes();

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
          D
        </div>
        <span className="text-lg font-semibold">DSE-PMS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        <p className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-sidebar-muted">
          Plugins
        </p>
        {routes.map((route) => {
          const Icon = route.icon ? iconMap[route.icon] : undefined;
          const active = pathname === route.path || pathname.startsWith(`${route.path}/`);
          return (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground",
              )}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {route.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-sidebar-muted">DSE Program Management</div>
    </aside>
  );
}
