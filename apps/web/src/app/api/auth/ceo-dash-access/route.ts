import { NextResponse } from "next/server";
import { userCanAccessCeoDash } from "@/lib/auth/roles";

/**
 * Server-only gate for CEO Dash UI. Returns a boolean only; never exposes allowlist emails.
 */
export async function GET() {
  const showCeoDash = await userCanAccessCeoDash();
  return NextResponse.json({ showCeoDash });
}
