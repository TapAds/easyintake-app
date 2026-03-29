import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Platform super-admin (Clerk). Set `role: "super_admin"` on the user's
 * **public metadata** and/or on the **session token** claims (JWT template)
 * so it appears in `sessionClaims.role` — verify in Clerk Dashboard for your instance.
 */
export async function userHasSuperAdminRole(): Promise<boolean> {
  const a = await auth();
  const claims = (a.sessionClaims ?? {}) as Record<string, unknown>;

  if (claims.role === "super_admin") return true;

  const meta = claims.metadata;
  if (
    meta &&
    typeof meta === "object" &&
    (meta as Record<string, unknown>).role === "super_admin"
  ) {
    return true;
  }

  const user = await currentUser();
  const pm = user?.publicMetadata as Record<string, unknown> | undefined;
  return pm?.role === "super_admin";
}
