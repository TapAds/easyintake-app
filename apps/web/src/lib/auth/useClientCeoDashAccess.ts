"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

/**
 * CEO Dash nav visibility — aligned with {@link userCanAccessCeoDash} but enforced on the server.
 * Always false until `/api/auth/ceo-dash-access` returns `{ showCeoDash: true }` (never trust client-only checks).
 */
export function useClientCeoDashAccess(): boolean {
  const { isLoaded: authLoaded, isSignedIn, sessionClaims } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [showCeoDash, setShowCeoDash] = useState(false);

  const claimRole =
    typeof sessionClaims?.role === "string" ? sessionClaims.role : "";
  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const publicRole =
    user?.publicMetadata && typeof user.publicMetadata === "object"
      ? String(
          (user.publicMetadata as Record<string, unknown>).role ?? "",
        )
      : "";

  useEffect(() => {
    if (!authLoaded || !userLoaded || !isSignedIn || !user?.id) {
      setShowCeoDash(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/ceo-dash-access", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setShowCeoDash(false);
          return;
        }
        const data = (await res.json()) as { showCeoDash?: unknown };
        if (!cancelled) setShowCeoDash(data.showCeoDash === true);
      } catch {
        if (!cancelled) setShowCeoDash(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoaded,
    claimRole,
    isSignedIn,
    primaryEmail,
    publicRole,
    user?.id,
    userLoaded,
  ]);

  return showCeoDash;
}
