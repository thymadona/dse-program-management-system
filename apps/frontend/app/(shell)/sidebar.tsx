"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavRoutes, iconMap } from "@/lib/nav";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@dse-pms/ui";

/** Dark brand sidebar (#102A30), collapsible to icons. Nav items come from the plugin manifest. */
export function AppSidebar() {
  const pathname = usePathname();
  const routes = getNavRoutes();

  return (
    <SidebarPrimitive collapsible="icon" className="border-r-0 bg-sidebar text-sidebar-foreground">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
            D
          </div>
          <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            DSE-PMS
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted">Plugins</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {routes.map((route) => {
                const Icon = route.icon ? iconMap[route.icon] : undefined;
                const active = pathname === route.path || pathname.startsWith(`${route.path}/`);
                return (
                  <SidebarMenuItem key={route.path}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={route.label}
                      render={
                        <Link href={route.path}>
                          {Icon ? <Icon /> : null}
                          <span>{route.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-sidebar-muted group-data-[collapsible=icon]:hidden">
          DSE Program Management
        </p>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
