import { methodsManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createMethodRouter } from "./router.ts";
import { methodService, type MethodService } from "./service.ts";

/** Methods plugin: shared manifest + Express router + public service. */
export const methodsPlugin: BackendPlugin<MethodService> = {
  manifest: methodsManifest,
  router: createMethodRouter(),
  service: methodService,
};
