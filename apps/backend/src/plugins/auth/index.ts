import { authManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createAuthRouter } from "./router.ts";
import { authService, type AuthService } from "./service.ts";

export const authPlugin: BackendPlugin<AuthService> = {
  manifest: authManifest,
  router: createAuthRouter(),
  service: authService,
};
