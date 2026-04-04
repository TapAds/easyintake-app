import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { userCanViewSettingsUsers } from "@/lib/auth/roles";

const ROLES = new Set(["org:admin", "org:member"]);

function appOriginFromRequest(req: Request): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return "http://localhost:3000";
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const allowed = await userCanViewSettingsUsers();
  if (!allowed) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const nameRaw = (body as Record<string, unknown>).name;
  const emailRaw = (body as Record<string, unknown>).email;
  const roleRaw = (body as Record<string, unknown>).role;

  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const role =
    typeof roleRaw === "string" && ROLES.has(roleRaw) ? roleRaw : "org:member";

  if (!name || name.length > 200 || !email || !isValidEmail(email)) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const redirectUrl = `${appOriginFromRequest(req)}/en/dashboard/applications`;

  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: email,
      role,
      inviterUserId: userId,
      redirectUrl,
      publicMetadata: { invitedFullName: name },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    let message = "Request failed";
    if (err && typeof err === "object" && "errors" in err) {
      const errors = (err as { errors?: Array<{ message?: string; longMessage?: string }> })
        .errors;
      const first = errors?.[0];
      message = first?.longMessage ?? first?.message ?? message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    return NextResponse.json({ error: "CLERK", message }, { status: 422 });
  }
}
