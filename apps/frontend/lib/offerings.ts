import type {
  CreateOfferingInput,
  OfferingStatus,
  OfferingView,
  UpdateOfferingInput,
} from "@dse-pms/shared-types";
import { api } from "./api";

export const offeringsApi = {
  list(): Promise<OfferingView[]> {
    return api.get<OfferingView[]>("/api/offerings");
  },
  create(input: CreateOfferingInput): Promise<OfferingView> {
    return api.post<OfferingView>("/api/offerings", input);
  },
  update(id: string, input: UpdateOfferingInput): Promise<OfferingView> {
    return api.patch<OfferingView>(`/api/offerings/${id}`, input);
  },
  remove(id: string): Promise<void> {
    return api.delete<void>(`/api/offerings/${id}`);
  },
  enroll(id: string, studentIds: string[]): Promise<OfferingView> {
    return api.post<OfferingView>(`/api/offerings/${id}/enrollments`, { studentIds });
  },
  unenroll(id: string, studentId: string): Promise<OfferingView> {
    return api.delete<OfferingView>(`/api/offerings/${id}/enrollments/${studentId}`);
  },
};

/** Map an offering status to a StatusBadge tone. */
export function offeringTone(status: OfferingStatus): "live" | "upcoming" | "neutral" {
  if (status === "Active") return "live";
  if (status === "Planned") return "upcoming";
  return "neutral";
}
