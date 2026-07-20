import { coursesManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createCourseRouter } from "./router.ts";
import { courseService, type CourseService } from "./service.ts";

export const coursesPlugin: BackendPlugin<CourseService> = {
  manifest: coursesManifest,
  router: createCourseRouter(),
  service: courseService,
};
