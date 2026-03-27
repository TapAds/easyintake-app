import { NextResponse } from "next/server";

/**
 * BFF proxy to apps/api GET /api/health/voice (avoids browser CORS to Railway).
 */
export async function GET() {
  const base = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base?.trim()) {
    return NextResponse.json(
      { error: "API_BASE_URL or NEXT_PUBLIC_API_URL must be set" },
      { status: 500 }
    );
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/health/voice`, {
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach intake API" }, { status: 502 });
  }
}
