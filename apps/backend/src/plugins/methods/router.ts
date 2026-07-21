import { Router } from "express";
import { CreateMethodInput } from "@dse-pms/shared-types";
import { requireAuth } from "../../core/auth/middleware.ts";
import { requirePermission } from "../../core/permissions/index.ts";
import { methodService } from "./service.ts";

/**
 * Methods REST router. Reads need `methods:read`, adds need `methods:write`.
 * POST is idempotent on name: 201 when created, 200 when the name already existed.
 */
export function createMethodRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/", requirePermission("methods:read"), async (_req, res) => {
    res.json(await methodService.list());
  });

  router.post("/teaching", requirePermission("methods:write"), async (req, res) => {
    const parsed = CreateMethodInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    try {
      const { method, created } = await methodService.addTeaching(parsed.data);
      res.status(created ? 201 : 200).json(method);
    } catch {
      res.status(500).json({ error: "Could not add method" });
    }
  });

  router.post("/assessment", requirePermission("methods:write"), async (req, res) => {
    const parsed = CreateMethodInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
      return;
    }
    try {
      const { method, created } = await methodService.addAssessment(parsed.data);
      res.status(created ? 201 : 200).json(method);
    } catch {
      res.status(500).json({ error: "Could not add method" });
    }
  });

  return router;
}
