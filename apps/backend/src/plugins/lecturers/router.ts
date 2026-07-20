import { Router } from "express";
import { requireAuth } from "../../core/auth/middleware.ts";
import { requirePermission } from "../../core/permissions/index.ts";
import { lecturerService } from "./service.ts";

/** Read-only Lecturers router. */
export function createLecturerRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", requirePermission("lecturers:read"), async (_req, res) => {
    res.json(await lecturerService.list());
  });

  router.get("/:id", requirePermission("lecturers:read"), async (req, res) => {
    const lecturer = await lecturerService.getById(req.params.id!);
    if (!lecturer) {
      res.status(404).json({ error: "Lecturer not found" });
      return;
    }
    res.json(lecturer);
  });

  return router;
}
