import { lecturersManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createLecturerRouter } from "./router.ts";
import { lecturerService, type LecturerService } from "./service.ts";

export const lecturersPlugin: BackendPlugin<LecturerService> = {
  manifest: lecturersManifest,
  router: createLecturerRouter(),
  service: lecturerService,
};
