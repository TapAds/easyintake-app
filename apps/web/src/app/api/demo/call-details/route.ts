import { NextRequest, NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";
import {
  mergeCallEntityForClient,
  tierFromOverall,
  transcriptSegmentsToText,
} from "@/lib/demo/mergeCallEntity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CallApiRow = {
  callSid?: string;
  status?: string;
  completenessScore?: number;
  entity?: Record<string, unknown> | null;
};

type TranscriptResponse = {
  segments?: { speaker: string; text: string }[];
};

/**
 * BFF: Clerk → JWT → GET /api/calls/:callSid + transcript; merged entity + transcript text.
 */
export async function GET(request: NextRequest) {
  const callSid = request.nextUrl.searchParams.get("callSid")?.trim();
  if (!callSid) {
    return NextResponse.json({ error: "callSid required" }, { status: 400 });
  }

  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  const headers = { Authorization: `Bearer ${token}` };

  let callRes: Response;
  let trRes: Response;
  try {
    [callRes, trRes] = await Promise.all([
      fetch(`${base}/api/calls/${encodeURIComponent(callSid)}`, {
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(25_000),
      }),
      fetch(
        `${base}/api/calls/${encodeURIComponent(callSid)}/transcript?limit=500`,
        {
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(25_000),
        }
      ),
    ]);
  } catch (err) {
    console.error("[call-details BFF] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach intake API." },
      { status: 502 }
    );
  }

  if (!callRes.ok) {
    const text = await callRes.text();
    let body: Record<string, unknown> = { error: `HTTP ${callRes.status}` };
    try {
      if (text) body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    return NextResponse.json(body, { status: callRes.status });
  }

  const call = (await callRes.json()) as CallApiRow;
  let transcriptText = "";
  if (trRes.ok) {
    const tr = (await trRes.json()) as TranscriptResponse;
    transcriptText = transcriptSegmentsToText(tr.segments ?? []);
  }

  const entities = mergeCallEntityForClient(call.entity ?? null);
  const overall = call.completenessScore ?? 0;

  return NextResponse.json({
    callSid,
    callStatus: call.status,
    completenessScore: overall,
    score: { overall, tier: tierFromOverall(overall) },
    entities,
    transcript: transcriptText,
  });
}
