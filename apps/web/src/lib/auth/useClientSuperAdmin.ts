"use client";

import { useAuth, useUser } from "@clerk/nextjs";

/**
 * Client-side super_admin check (align with {@link userHasSuperAdminRole}).
 * Returns false while Clerk is loading — nav defaults to the non–super-admin path until then.
 */
export function useClientSuperAdmin(): boolean {
  const { isLoaded: authLoaded, sessionClaims } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();

  if (!authLoaded || !userLoaded) return false;

  const claims = sessionClaims as Record<string, unknown> | undefined;
  if (claims?.role === "super_admin") return true;
  const meta = claims?.metadata;
  if (
    meta &&
    typeof meta === "object" &&
    (meta as Record<string, unknown>).role === "super_admin"
  ) {
    return true;
  }

  const pm = user?.publicMetadata as Record<string, unknown> | undefined;
  return pm?.role === "super_admin";
}
