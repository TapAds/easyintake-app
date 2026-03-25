import { NextResponse } from "next/server";
import { getIntakeSessionFixture } from "@/lib/bff/intakeSessionFixture";

/**
 * BFF stub: returns fixture data shaped to IntakeSession.
 * Replace with apps/api proxy when session API is available.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  const params = await Promise.resolve(context.params);
  const sessionId = params.sessionId ?? "unknown";
  const body = getIntakeSessionFixture(sessionId);
  return NextResponse.json(body);
}
