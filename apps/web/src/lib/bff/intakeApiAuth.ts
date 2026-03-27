import { auth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

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
  try {
    const session = await auth();
    userId = session.userId ?? null;
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

  const token = jwt.sign(
    { sub: userId, purpose: "operator" },
    secret,
    { expiresIn: "2m" }
  );
  return { token, base };
}
