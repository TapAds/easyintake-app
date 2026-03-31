import { NextRequest, NextResponse } from "next/server";
import { normalizeApiBaseUrl } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF: forwards applicant portal Bearer token to apps/api public intake routes.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const base = normalizeApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "API_BASE_URL or NEXT_PUBLIC_API_URL must be set" },
      { status: 500 }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/public/intake/session`, {
      headers: { Authorization: auth },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[public intake BFF] GET failed:", err);
    return NextResponse.json({ error: "Failed to reach intake API." }, { status: 502 });
  }

  const text = await res.text();
  let payload: unknown = {};
  try {
    if (text) payload = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { error: `Intake API returned non-JSON (HTTP ${res.status}).` },
      { status: 502 }
    );
  }

  return NextResponse.json(payload, { status: res.status });
}

export async function PATCH(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const base = normalizeApiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "API_BASE_URL or NEXT_PUBLIC_API_URL must be set" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/public/intake/session`, {
      method: "PATCH",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[public intake BFF] PATCH failed:", err);
    return NextResponse.json({ error: "Failed to reach intake API." }, { status: 502 });
  }

  const text = await res.text();
  let payload: unknown = {};
  try {
    if (text) payload = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json(
      { error: `Intake API returned non-JSON (HTTP ${res.status}).` },
      { status: 502 }
    );
  }

  return NextResponse.json(payload, { status: res.status });
}
