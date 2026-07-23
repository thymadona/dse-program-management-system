import { rubricsManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createRubricRouter } from "./router.ts";
import { rubricService, type RubricService } from "./service.ts";

/** Rubric Library plugin: shared manifest + Express router + public service. */
export const rubricsPlugin: BackendPlugin<RubricService> = {
  manifest: rubricsManifest,
  router: createRubricRouter(),
  service: rubricService,
};
