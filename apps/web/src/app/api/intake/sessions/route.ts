import { NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF: Clerk → JWT → GET apps/api/api/intake/sessions
 */
export async function GET() {
  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let res: Response;
  try {
    res = await fetch(`${base}/api/intake/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error("[intake sessions BFF] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach intake API." },
      { status: 502 }
    );
  }

  const text = await res.text();
  let payload: unknown = [];
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
