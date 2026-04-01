import { NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF: Clerk → JWT → POST apps/api/api/intake/sessions/from-call-transcript
 */
export async function POST(request: Request) {
  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${base}/api/intake/sessions/from-call-transcript`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error("[intake fork BFF] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach intake API." },
      { status: 502 }
    );
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
