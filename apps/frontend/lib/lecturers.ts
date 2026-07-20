import type { Lecturer } from "@dse-pms/shared-types";
import { api } from "./api";

export const lecturersApi = {
  list(): Promise<Lecturer[]> {
    return api.get<Lecturer[]>("/api/lecturers");
  },
};
