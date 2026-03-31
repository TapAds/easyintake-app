import { NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  const params = await Promise.resolve(context.params);
  const sessionId = params.sessionId ?? "";

  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let body: unknown = {};
  try {
    const t = await request.text();
    if (t) body = JSON.parse(t) as unknown;
  } catch {
    body = {};
  }

  let res: Response;
  try {
    res = await fetch(
      `${base}/api/intake/sessions/${encodeURIComponent(sessionId)}/applicant-portal-token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      }
    );
  } catch (err) {
    console.error("[applicant-portal-token BFF] failed:", err);
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
