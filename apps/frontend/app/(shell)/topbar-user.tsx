"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { MeResponse } from "@dse-pms/shared-types";
import { Button } from "@dse-pms/ui";
import { authApi } from "@/lib/auth";
import { AUTH_MODE, getSupabase } from "@/lib/supabase";

/** Shows the signed-in user (email + role) and a Sign out action (supabase mode). */
export function TopbarUser() {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    authApi.me().then(setMe).catch(() => setMe(null));
  }, []);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    router.replace("/login");
  };

  if (!me) return null;

  return (
    <div className="flex items-center gap-3">
      <span className="text-foreground">
        {me.email} · <span className="capitalize text-muted-foreground">{me.role}</span>
      </span>
      {AUTH_MODE === "supabase" ? (
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      ) : null}
    </div>
  );
}
