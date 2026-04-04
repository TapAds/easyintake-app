import { NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF: Clerk → JWT → GET apps/api/api/onboarding/state
 */
export async function GET() {
  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let res: Response;
  try {
    res = await fetch(`${base}/api/onboarding/state`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[onboarding state BFF] GET fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach intake API." },
      { status: 502 }
    );
  }

  const text = await res.text();
  let payload: unknown = null;
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

/**
 * BFF: Clerk → JWT → POST apps/api/api/onboarding/state
 */
export async function POST(req: Request) {
  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/onboarding/state`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[onboarding state BFF] POST fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach intake API." },
      { status: 502 }
    );
  }

  const text = await res.text();
  let payload: unknown = null;
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
