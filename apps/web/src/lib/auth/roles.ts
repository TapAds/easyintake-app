import { auth, currentUser } from "@clerk/nextjs/server";
import { ceoDashAllowedEmails } from "@/lib/auth/ceoDashAllowlist";

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

/** Platform CEO dashboard: super_admin and primary email on the CEO allowlist. */
export async function userCanAccessCeoDash(): Promise<boolean> {
  if (!(await userHasSuperAdminRole())) return false;

  const allowed = ceoDashAllowedEmails();
  if (allowed.length === 0) return false;

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  if (!email) return false;
  return allowed.includes(email);
}

/**
 * Agents and agency admins configure CRM sync and forms; applicants do not.
 * Uses session claims / public metadata `role` when present.
 */
export async function userCanConfigureIntake(): Promise<boolean> {
  const a = await auth();
  if (!a.userId) return false;

  const claims = (a.sessionClaims ?? {}) as Record<string, unknown>;
  if (claims.role === "super_admin") return true;
  if (claims.role === "applicant") return false;

  const user = await currentUser();
  const pm = user?.publicMetadata as Record<string, unknown> | undefined;
  if (pm?.role === "applicant") return false;

  return true;
}

/**
 * Settings "Users" section: platform super-admins and organization admins only.
 * Uses Clerk `orgRole` when an organization is active, plus session/public metadata fallbacks
 * (`org_role` / `role`) — align claims in Clerk Dashboard with your JWT template.
 */
export async function userCanViewSettingsUsers(): Promise<boolean> {
  const a = await auth();
  if (!a.userId) return false;

  const claims = (a.sessionClaims ?? {}) as Record<string, unknown>;
  if (claims.role === "super_admin") return true;
  if (claims.role === "org:admin") return true;
  if (claims.org_role === "org:admin") return true;

  if (a.orgRole === "org:admin") return true;

  const user = await currentUser();
  const pm = user?.publicMetadata as Record<string, unknown> | undefined;
  if (pm?.role === "super_admin") return true;
  if (pm?.role === "org:admin") return true;
  if (pm?.org_role === "org:admin") return true;

  return false;
}

/** Org branding in Settings (name, website, logo): same gate as Users invites. */
export async function userCanEditOrganizationProfile(): Promise<boolean> {
  return userCanViewSettingsUsers();
}
