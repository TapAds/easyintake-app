import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildImmN400FillData } from "@/lib/anvil/buildImmN400FillData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ANVIL_FILL_BASE = "https://app.useanvil.com/api/v1/fill";

function basicAuthHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export async function POST(req: Request) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId ?? null;
  } catch (err) {
    console.error("[anvil-pdf] auth() failed:", err);
    return NextResponse.json(
      {
        error:
          "Authentication failed. Ensure Clerk middleware runs on /api routes.",
      },
      { status: 500 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANVIL_API_KEY?.trim();
  const templateId = process.env.ANVIL_TEMPLATE_IMM_400_EID?.trim();
  if (!apiKey || !templateId) {
    return NextResponse.json(
      {
        error:
          "PDF generation is not configured. Set ANVIL_API_KEY and ANVIL_TEMPLATE_IMM_400_EID on the server.",
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const entities =
    body &&
    typeof body === "object" &&
    "entities" in body &&
    body.entities !== null &&
    typeof body.entities === "object" &&
    !Array.isArray(body.entities)
      ? (body.entities as Record<string, unknown>)
      : null;

  if (!entities) {
    return NextResponse.json(
      { error: "Expected body: { entities: Record<string, unknown> }" },
      { status: 400 }
    );
  }

  const data = buildImmN400FillData(entities);
  const payload = {
    title: "USCIS N400",
    fontSize: 10,
    textColor: "#333333",
    data,
  };

  const url = `${ANVIL_FILL_BASE}/${encodeURIComponent(templateId)}.pdf`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(apiKey),
        "Content-Type": "application/json",
        Accept: "application/pdf",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    console.error("[anvil-pdf] fetch failed:", err);
    return NextResponse.json(
      { error: "Could not reach PDF service. Try again later." },
      { status: 502 }
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());

  if (!res.ok) {
    let message = `PDF service error (HTTP ${res.status})`;
    try {
      const errJson = JSON.parse(buf.toString("utf8")) as {
        message?: string;
        name?: string;
        fields?: { message?: string }[];
      };
      if (typeof errJson.message === "string") message = errJson.message;
      else if (errJson.fields?.[0]?.message)
        message = errJson.fields[0].message;
    } catch {
      if (buf.length > 0 && buf.length < 2000) {
        const text = buf.toString("utf8");
        if (text.trim()) message = text.trim().slice(0, 500);
      }
    }
    console.error("[anvil-pdf] Anvil error:", res.status, message);
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("pdf") && !buf.subarray(0, 4).equals(Buffer.from("%PDF"))) {
    console.error("[anvil-pdf] unexpected content-type:", ct);
    return NextResponse.json(
      { error: "PDF service returned an unexpected response." },
      { status: 502 }
    );
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="uscis-n400.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
