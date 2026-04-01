import { auth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { userHasSuperAdminRole } from "@/lib/auth/roles";

export function normalizeApiBaseUrl(): string | null {
  const raw = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const base = raw?.trim();
  if (!base) return null;
  if (!/^https?:\/\//i.test(base)) {
    const host = base.replace(/^\/+/, "");
    const scheme =
      /^localhost\b/i.test(host) || /^127\.0\.0\.1\b/.test(host)
        ? "http"
        : "https";
    return `${scheme}://${host}`.replace(/\/$/, "");
  }
  return base.replace(/\/$/, "");
}

/**
 * Clerk session → short-lived JWT for apps/api, or NextResponse error.
 */
export async function intakeApiBearerToken(): Promise<
  { token: string; base: string } | NextResponse
> {
  let userId: string | null = null;
  let orgId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId ?? null;
    orgId = session.orgId ?? null;
  } catch (err) {
    console.error("[intakeApiAuth] auth() failed:", err);
    return NextResponse.json(
      { error: "Authentication failed." },
      { status: 500 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isSuperAdmin = await userHasSuperAdminRole();
  const org = orgId?.trim() ?? "";
  if (!isSuperAdmin && !org) {
    return NextResponse.json(
      {
        error: "Select or create an organization to use the intake API.",
        code: "NO_ORG",
      },
      { status: 403 }
    );
  }

  const secret = process.env.API_JWT_SECRET?.trim();
  const base = normalizeApiBaseUrl();
  if (!secret || !base) {
    return NextResponse.json(
      {
        error:
          "API_JWT_SECRET and API base URL (API_BASE_URL or NEXT_PUBLIC_API_URL) must be set on the server",
      },
      { status: 500 }
    );
  }

  const payload: Record<string, unknown> = {
    sub: userId,
    purpose: "operator",
  };
  if (isSuperAdmin) {
    payload.super_admin = true;
  }
  if (org) {
    payload.org_id = org;
  }

  const token = jwt.sign(payload, secret, { expiresIn: "2m" });
  return { token, base };
}
