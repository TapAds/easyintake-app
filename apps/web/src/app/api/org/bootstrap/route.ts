import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { userHasSuperAdminRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function truncateOrgName(s: string, max = 64): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Self-service: create a Clerk organization when the user has no memberships and no pending invites.
 * Invite path: user already has (or will have) membership — never create a second org here.
 */
export async function POST() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (await userHasSuperAdminRole()) {
    return NextResponse.json({
      ok: true,
      action: "skip_super_admin" as const,
    });
  }

  const activeOrg = orgId?.trim() ?? "";
  if (activeOrg) {
    return NextResponse.json({
      ok: true,
      action: "already_active" as const,
      organizationId: activeOrg,
    });
  }

  const client = await clerkClient();

  const membershipRes = await client.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });
  const memberships = membershipRes.data ?? [];

  if (memberships.length > 0) {
    const first = memberships[0]!.organization.id;
    return NextResponse.json({
      ok: true,
      action: "activate_existing" as const,
      organizationId: first,
    });
  }

  const invitationRes = await client.users.getOrganizationInvitationList({
    userId,
    status: "pending",
    limit: 50,
  });
  const invitations = invitationRes.data ?? [];

  if (invitations.length > 0) {
    return NextResponse.json({
      ok: true,
      action: "pending_invitation" as const,
    });
  }

  const user = await client.users.getUser(userId);
  const fn = user.firstName?.trim() ?? "";
  const ln = user.lastName?.trim() ?? "";
  const fromName = [fn, ln].filter(Boolean).join(" ").trim();
  const emailLocal =
    user.primaryEmailAddress?.emailAddress?.split("@")[0]?.trim() ?? "";
  const baseName = fromName || emailLocal || "Organization";
  const name = truncateOrgName(`${baseName} — Easy Intake`);

  try {
    const org = await client.organizations.createOrganization({
      name,
      createdBy: userId,
    });
    return NextResponse.json({
      ok: true,
      action: "created" as const,
      organizationId: org.id,
    });
  } catch (err: unknown) {
    let message = "Could not create organization";
    if (err && typeof err === "object" && "errors" in err) {
      const errors = (err as { errors?: Array<{ message?: string; longMessage?: string }> })
        .errors;
      const first = errors?.[0];
      message = first?.longMessage ?? first?.message ?? message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    console.error("[org/bootstrap] createOrganization failed:", err);
    return NextResponse.json({ error: "CLERK", message }, { status: 422 });
  }
}
