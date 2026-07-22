import type { CreateAccountInput, MeResponse } from "@dse-pms/shared-types";
import { api } from "./api";

/**
 * Auth plugin calls. `me` resolves the current caller (email + role, from the
 * backend's `User` row). `createAccount` is the admin-only lecturer-provisioning
 * action — it invites the email via Supabase and links the app profile.
 */
export const authApi = {
  me(): Promise<MeResponse> {
    return api.get<MeResponse>("/api/auth/me");
  },
  createAccount(input: CreateAccountInput): Promise<MeResponse> {
    return api.post<MeResponse>("/api/auth/accounts", input);
  },
};
