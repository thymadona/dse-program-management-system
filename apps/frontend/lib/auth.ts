import { useEffect, useState } from "react";
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

/**
 * Cached in-flight `/me` request, shared across all `useMe()` callers so the
 * sidebar, the page guard and the topbar don't each fire their own request.
 */
let mePromise: Promise<MeResponse> | null = null;
function fetchMe(): Promise<MeResponse> {
  if (!mePromise) mePromise = authApi.me();
  return mePromise;
}

/** Resolved current caller, or `null` while loading / on error. */
export function useMe(): { me: MeResponse | null; loading: boolean } {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMe()
      .then((res) => active && setMe(res))
      .catch(() => active && setMe(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { me, loading };
}
