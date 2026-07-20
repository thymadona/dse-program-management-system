import {
  Book,
  Layers,
  LayoutDashboard,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import { navFromManifests, pluginManifests, type PluginRoute } from "@dse-pms/shared-types";

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
};

export function getNavRoutes(): PluginRoute[] {
  return navFromManifests(pluginManifests);
}
