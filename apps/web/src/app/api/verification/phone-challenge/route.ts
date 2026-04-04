import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Placeholder for phone-first session stitching (OTP / magic link).
 * Wire to SMS provider and IntakeSession.webVerified* when ready.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      code: "SESSION_STITCHING_PENDING",
    },
    { status: 501 }
  );
}
