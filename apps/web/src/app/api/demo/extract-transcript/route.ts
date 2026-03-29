import { NextRequest, NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExtractApiResponse = {
  callSid?: string;
  entities?: Record<string, unknown>;
  score?: { overall: number; tier: string };
  mergeMeta?: {
    appliedKeys?: string[];
    skippedDueToCorrection?: string[];
  };
  error?: string;
  utteranceCount?: number;
  chunkCount?: number;
};

/**
 * Clerk → JWT → POST /api/calls/:callSid/extract (batch transcript extraction).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const callSid =
    body &&
    typeof body === "object" &&
    "callSid" in body &&
    typeof (body as { callSid?: unknown }).callSid === "string"
      ? (body as { callSid: string }).callSid.trim()
      : "";

  if (!callSid) {
    return NextResponse.json(
      { error: "Expected body: { callSid: string }" },
      { status: 400 }
    );
  }

  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let res: Response;
  try {
    res = await fetch(
      `${base}/api/calls/${encodeURIComponent(callSid)}/extract`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(180_000),
      }
    );
  } catch (err) {
    console.error("[extract-transcript BFF] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach intake API." },
      { status: 502 }
    );
  }

  const text = await res.text();
  let parsed: ExtractApiResponse = {};
  try {
    if (text) parsed = JSON.parse(text) as ExtractApiResponse;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: parsed.error ?? `HTTP ${res.status}` },
      { status: res.status }
    );
  }

  return NextResponse.json(parsed);
}
