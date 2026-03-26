import { NextResponse } from "next/server";
import { getIntakeQueueFixture } from "@/lib/bff/intakeQueueFixture";

/**
 * BFF stub: list intake sessions for the agent queue.
 */
export async function GET() {
  return NextResponse.json(getIntakeQueueFixture());
}
