"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { PluginRoute } from "@dse-pms/shared-types";
import { getNavRoutes, iconMap } from "@/lib/nav";
import { coursesApi, type CourseView } from "@/lib/courses";
import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@dse-pms/ui";

/** Sidebar follows the canvas theme (white in light mode, near-black in dark), collapsible to icons. Nav items come from the plugin manifest. */
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
                // Course Management gets an expandable list of courses; each course
                // jumps straight to its spec page instead of routing through the table.
                if (route.path === "/courses") {
                  return (
                    <CourseNavItem key={route.path} route={route} Icon={Icon} pathname={pathname} />
                  );
                }
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

/**
 * Expandable "Course Management" nav item. The label still links to the courses
 * list; the chevron toggles a sub-list of every course, each linking directly to
 * its Course Specification page (`/courses/:id/spec`). Courses are fetched the
 * first time the section is opened (auto-open when already on a course route).
 */
function CourseNavItem({
  route,
  Icon,
  pathname,
}: {
  route: PluginRoute;
  Icon?: LucideIcon;
  pathname: string;
}) {
  const onCourseRoute = pathname === route.path || pathname.startsWith(`${route.path}/`);
  const [open, setOpen] = useState(onCourseRoute);
  const [courses, setCourses] = useState<CourseView[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || courses !== null) return;
    setLoading(true);
    coursesApi
      .list()
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, [open, courses]);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={pathname === route.path}
        tooltip={route.label}
        render={
          <Link href={route.path}>
            {Icon ? <Icon /> : null}
            <span>{route.label}</span>
          </Link>
        }
      />
      <SidebarMenuAction
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Collapse courses" : "Expand courses"}
        aria-expanded={open}
      >
        <ChevronRight className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </SidebarMenuAction>

      {open ? (
        <SidebarMenuSub>
          {loading && courses === null ? (
            <SidebarMenuSubItem>
              <SidebarMenuSkeleton />
            </SidebarMenuSubItem>
          ) : courses && courses.length > 0 ? (
            courses.map((course) => (
              <SidebarMenuSubItem key={course.id}>
                <SidebarMenuSubButton
                  isActive={pathname.startsWith(`/courses/${course.id}`)}
                  render={
                    <Link href={`/courses/${course.id}/spec`} title={`${course.code} – ${course.title}`}>
                      <span>
                        {course.code} – {course.title}
                      </span>
                    </Link>
                  }
                />
              </SidebarMenuSubItem>
            ))
          ) : (
            <SidebarMenuSubItem>
              <span className="px-2 py-1 text-xs text-sidebar-muted">No courses yet</span>
            </SidebarMenuSubItem>
          )}
        </SidebarMenuSub>
      ) : null}
    </SidebarMenuItem>
  );
}
