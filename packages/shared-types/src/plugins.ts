/**
 * The plugin contract — the single source of truth shared by the backend
 * (which attaches an Express router + service to each plugin) and the frontend
 * (which renders the sidebar nav from the same manifest). Because both apps
 * import this file, the contract can never drift between them.
 */

import type { Role } from "./auth.ts";

export interface PluginRoute {
  /** Label shown in the sidebar. */
  label: string;
  /** Frontend path, e.g. "/students". */
  path: string;
  /** Optional icon key resolved by the frontend nav. */
  icon?: string;
  /**
   * Roles allowed to see this route in the sidebar and open its page.
   * Omitted = visible to every authenticated role. Enforced on the frontend
   * (sidebar filter + shell page guard); backend permission strings gate the API.
   */
  roles?: Role[];
}

/**
 * Metadata portion of a plugin. Pure data — no server or React code — so it is
 * safe to import from either app.
 */
export interface PluginManifest {
  /** Stable id, also the API mount segment: /api/{id}. */
  id: string;
  name: string;
  version: string;
  description?: string;
  /** Sidebar routes contributed by the plugin. */
  routes?: PluginRoute[];
  /** Permission strings this plugin defines, e.g. "students:read". */
  permissions?: string[];
}

/**
 * Full backend-side plugin. `TService` is the plugin's public service surface,
 * reachable cross-plugin via `registry.get(id).service` — the in-process
 * equivalent of an API call, never a direct internal import.
 */
export interface DSEPlugin<TService = unknown> {
  manifest: PluginManifest;
  /** Express Router — typed as unknown here to keep this package framework-free. */
  router: unknown;
  service: TService;
}

/**
 * The manifest registry: the ordered list of plugin metadata the whole system
 * knows about. Adding a plugin later means appending its manifest here (and
 * registering its router/service on the backend).
 */
export const studentsManifest: PluginManifest = {
  id: "students",
  name: "Students",
  version: "0.1.0",
  description: "Student records — CRUD, list, profile.",
  routes: [{ label: "Students", path: "/students", icon: "users", roles: ["admin"] }],
  permissions: ["students:read", "students:write"],
};

export const coursesManifest: PluginManifest = {
  id: "courses",
  name: "Courses",
  version: "0.1.0",
  description: "Courses — CRUD, list, assign lecturer.",
  routes: [{ label: "Course Management", path: "/courses", icon: "book", roles: ["admin", "lecturer"] }],
  permissions: ["courses:read", "courses:write", "courses:manage"],
};

export const offeringsManifest: PluginManifest = {
  id: "offerings",
  name: "Course Offerings",
  version: "0.1.0",
  description: "Links Students, Courses and Lecturers for a given term.",
  routes: [{ label: "Course Offerings", path: "/offerings", icon: "layers", roles: ["admin"] }],
  permissions: ["offerings:read", "offerings:write", "offerings:manage"],
};

export const lecturersManifest: PluginManifest = {
  id: "lecturers",
  name: "Lecturers",
  version: "0.1.0",
  description: "Lecturers — Users with the lecturer role, incl. syllabus contact details.",
  routes: [{ label: "Lecturers", path: "/lecturers", icon: "presentation", roles: ["admin"] }],
  permissions: ["lecturers:read", "lecturers:write"],
};

export const methodsManifest: PluginManifest = {
  id: "methods",
  name: "Methods",
  version: "0.1.0",
  description: "Teaching & assessment method vocabulary for course specs (§15).",
  permissions: ["methods:read", "methods:write"],
};

export const authManifest: PluginManifest = {
  id: "auth",
  name: "Auth",
  version: "0.1.0",
  description: "Identity (GET /me) and admin-only account provisioning via Supabase.",
  // No routes: not a sidebar entry — account creation is embedded in the Lecturers page.
  permissions: ["accounts:create"],
};

export const pluginManifests: PluginManifest[] = [
  studentsManifest,
  coursesManifest,
  offeringsManifest,
  lecturersManifest,
  methodsManifest,
  authManifest,
];

/** Whether `route` is visible to `role` (a route with no `roles` is open to all). */
export function routeAllowsRole(route: PluginRoute, role: Role): boolean {
  return route.roles === undefined || route.roles.includes(role);
}

/** Sidebar nav is generated automatically from plugin routes. */
export function navFromManifests(manifests: PluginManifest[]): PluginRoute[] {
  return manifests.flatMap((m) => m.routes ?? []);
}

/** Nav routes a given role may see — `navFromManifests` filtered by `roles`. */
export function navForRole(manifests: PluginManifest[], role: Role): PluginRoute[] {
  return navFromManifests(manifests).filter((r) => routeAllowsRole(r, role));
}
