import { auth } from "@clerk/nextjs/server";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

/**
 * Issues a short-lived HS256 JWT for the agent WebSocket on apps/api.
 * Payload must verify with the same secret as apps/api (`API_JWT_SECRET`).
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.API_JWT_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "API_JWT_SECRET is not configured" },
      { status: 500 }
    );
  }

  const token = jwt.sign(
    { sub: userId, purpose: "ws" },
    secret,
    { expiresIn: "24h" }
  );

  return NextResponse.json({ token });
}
