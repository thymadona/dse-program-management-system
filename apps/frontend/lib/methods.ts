import type { Method, MethodKind, MethodsResponse } from "@dse-pms/shared-types";
import { api } from "./api";

/** Client for the §15 method vocabulary endpoints (methods plugin). */
export const methodsApi = {
  list(): Promise<MethodsResponse> {
    return api.get<MethodsResponse>("/api/methods");
  },
  add(kind: MethodKind, name: string): Promise<Method> {
    return api.post<Method>(`/api/methods/${kind}`, { name });
  },
};
