"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_MODE, getSupabase } from "@/lib/supabase";

/**
 * Gates the authenticated shell. In AUTH_MODE=dev it's a pass-through (the app
 * runs on the static dev token). In supabase mode it requires a live session and
 * redirects to /login otherwise, reacting to sign-out in any tab.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(AUTH_MODE === "dev");

  useEffect(() => {
    if (AUTH_MODE !== "supabase") return;
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else router.replace("/login");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
