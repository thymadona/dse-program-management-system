import type { NextFunction, Request, Response } from "express";
import type { Role } from "../auth/token.ts";

/**
 * Role → permission map. Kept in the core (not per-plugin) so the whole
 * authorization surface is auditable in one place. Plugins declare which
 * permission a route needs; this map decides which roles hold it.
 */
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ["students:read", "students:write"],
  lecturer: ["students:read"],
  student: ["students:read"],
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
