import { offeringsManifest } from "@dse-pms/shared-types";
import type { BackendPlugin } from "../../core/plugins/registry.ts";
import { createOfferingRouter } from "./router.ts";
import { offeringService, type OfferingService } from "./service.ts";

export const offeringsPlugin: BackendPlugin<OfferingService> = {
  manifest: offeringsManifest,
  router: createOfferingRouter(),
  service: offeringService,
};
