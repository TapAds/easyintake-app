import { auth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

/**
 * BFF: Clerk session → signed JWT → apps/api GET /api/operator/twilio/recent-calls
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.API_JWT_SECRET;
  const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!secret || !base?.trim()) {
    return NextResponse.json(
      { error: "API_JWT_SECRET and API base URL must be set" },
      { status: 500 }
    );
  }

  const token = jwt.sign(
    { sub: userId, purpose: "operator" },
    secret,
    { expiresIn: "2m" }
  );

  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/api/operator/twilio/recent-calls`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach intake API" }, { status: 502 });
  }
}
