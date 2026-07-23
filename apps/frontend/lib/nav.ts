import {
  Book,
  ClipboardList,
  Layers,
  LayoutDashboard,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  navForRole,
  navFromManifests,
  pluginManifests,
  type PluginRoute,
  type Role,
} from "@dse-pms/shared-types";

/**
 * Sidebar nav is generated automatically from the shared plugin manifest — the
 * same source of truth the backend registers routers against. Adding a plugin
 * to `pluginManifests` makes it appear here with no other change.
 */
export const iconMap: Record<string, LucideIcon> = {
  users: Users,
  book: Book,
  layers: Layers,
  presentation: Presentation,
  dashboard: LayoutDashboard,
  clipboard: ClipboardList,
};

/** All nav routes, or — when a role is given — only those that role may see. */
export function getNavRoutes(role?: Role): PluginRoute[] {
  return role ? navForRole(pluginManifests, role) : navFromManifests(pluginManifests);
}
