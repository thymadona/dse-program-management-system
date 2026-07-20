import cors from "cors";
import express, { type Express } from "express";
import { registry } from "./plugins/registry.ts";
import { studentsPlugin } from "../plugins/students/index.ts";

/**
 * Builds the Express app: registers plugins, mounts each plugin router at
 * /api/{id}, and exposes /api/registry for nav/introspection. The core knows
 * nothing about any plugin's domain — it just iterates the registry.
 */
export function createApp(): Express {
  // Register plugins (one line per plugin — this is the only place they're listed).
  registry.register(studentsPlugin);

  const app = express();

  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());
  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Runtime introspection: the frontend can read the live manifest list.
  app.get("/api/registry", (_req, res) => res.json(registry.manifests()));

  // Mount every registered plugin's router at /api/{id}.
  for (const plugin of registry.all()) {
    app.use(`/api/${plugin.manifest.id}`, plugin.router);
  }

  return app;
}
