import { auth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Same resolution as other BFF routes; ensures a scheme so server-side fetch does not throw. */
function normalizeApiBaseUrl(): string | null {
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
 * BFF: Clerk session → signed JWT → apps/api GET /api/operator/twilio/recent-calls
 */
export async function GET() {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId ?? null;
  } catch (err) {
    console.error("[twilio-calls BFF] auth() failed:", err);
    return NextResponse.json(
      {
        error:
          "Authentication failed. Ensure Clerk middleware runs on /api routes (see Clerk auth-middleware).",
      },
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

  const url = `${base}/api/operator/twilio/recent-calls`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[twilio-calls BFF] fetch failed:", err);
    return NextResponse.json(
      {
        error:
          "Failed to reach intake API. Set API_BASE_URL or NEXT_PUBLIC_API_URL to your HTTPS Railway apps/api origin and redeploy.",
      },
      { status: 502 }
    );
  }

  const text = await res.text();
  let payload: Record<string, unknown> = {};
  try {
    if (text) {
      payload = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json(
      {
        error: `Intake API returned non-JSON (HTTP ${res.status}). Check API_BASE_URL points at apps/api (Railway), not the Vercel app.`,
      },
      { status: 502 }
    );
  }

  if (!res.ok && payload.error == null) {
    payload = {
      ...payload,
      error: `Intake API error (HTTP ${res.status})`,
    };
  }

  return NextResponse.json(payload, { status: res.status });
}
