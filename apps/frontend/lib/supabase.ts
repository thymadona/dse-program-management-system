import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client — the frontend's single source of the login session.
 * `AUTH_MODE=dev` keeps the app running on the static dev token (no Supabase env
 * needed for local work); `AUTH_MODE=supabase` turns on real login. The client is
 * built lazily so importing this module never throws when env is absent.
 */
export const AUTH_MODE: "dev" | "supabase" =
  process.env.NEXT_PUBLIC_AUTH_MODE === "supabase" ? "supabase" : "dev";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY must be set when AUTH_MODE=supabase",
    );
  }
  client = createClient(url, anon);
  return client;
}
