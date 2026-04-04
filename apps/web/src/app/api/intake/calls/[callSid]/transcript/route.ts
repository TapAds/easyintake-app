import { NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF: Clerk → JWT → GET apps/api/api/calls/:callSid/transcript
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ callSid: string }> }
) {
  const { callSid } = await context.params;
  const sid = callSid?.trim();
  if (!sid) {
    return NextResponse.json({ error: "callSid required" }, { status: 400 });
  }

  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let res: Response;
  try {
    res = await fetch(
      `${base}/api/calls/${encodeURIComponent(sid)}/transcript?limit=200`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      }
    );
  } catch (err) {
    console.error("[intake call transcript BFF] fetch failed:", err);
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
