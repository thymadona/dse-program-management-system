import type { NextFunction, Request, Response } from "express";
import type { Role } from "../auth/token.ts";

/**
 * Role → permission map. Kept in the core (not per-plugin) so the whole
 * authorization surface is auditable in one place. Plugins declare which
 * permission a route needs; this map decides which roles hold it.
 */
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "accounts:create",
    "students:read",
    "students:write",
    "courses:read",
    "courses:write",
    "courses:manage",
    "offerings:read",
    "offerings:write",
    "offerings:manage",
    "lecturers:read",
    "lecturers:write",
    "methods:read",
    "methods:write",
  ],
  // Lecturers get exactly what their job needs: read the catalog, fill in the
  // specification of the courses/offerings they're assigned to, and grow the
  // methods vocabulary from the §15 form. They do NOT get "*:manage" (creating,
  // deleting, or reassigning courses/offerings — a curriculum-admin action) or
  // "lecturers:write" (editing other lecturers' profiles) or "accounts:create".
  // Ownership of the specific course/offering is enforced in the route handlers,
  // not just by holding the permission string.
  lecturer: [
    "students:read",
    "courses:read",
    "courses:write",
    "offerings:read",
    "offerings:write",
    "lecturers:read",
    "methods:read",
    "methods:write",
  ],
  student: ["students:read", "courses:read", "offerings:read", "lecturers:read", "methods:read"],
};

export function roleHasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Guard factory: `requirePermission("students:write")`. Assumes `requireAuth`
 * ran first (so `req.user` is set); returns 403 when the role lacks the permission.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roleHasPermission(user.role, permission)) {
      res.status(403).json({ error: `Missing permission: ${permission}` });
      return;
    }
    next();
  };
}
