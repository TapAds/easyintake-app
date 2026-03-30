import { NextRequest, NextResponse } from "next/server";
import { intakeApiBearerToken } from "@/lib/bff/intakeApiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * BFF: multipart PDF → base64 → apps/api POST /api/intake/form-catalog/analyze-pdf
 */
export async function POST(request: NextRequest) {
  const authResult = await intakeApiBearerToken();
  if (authResult instanceof NextResponse) return authResult;
  const { token, base } = authResult;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Expected form field "file" (PDF)' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (buf.length > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF too large (max 15MB)" }, { status: 413 });
  }

  const pdfBase64 = buf.toString("base64");
  const filename = file instanceof File ? file.name : "upload.pdf";

  let res: Response;
  try {
    res = await fetch(`${base}/api/intake/form-catalog/analyze-pdf`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ pdfBase64, filename }),
      signal: AbortSignal.timeout(180_000),
    });
  } catch (err) {
    console.error("[form-catalog BFF] fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach intake API." }, { status: 502 });
  }

  const text = await res.text();
  let parsed: unknown = {};
  try {
    if (text) parsed = JSON.parse(text) as unknown;
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    const err =
      parsed &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof (parsed as { error?: unknown }).error === "string"
        ? (parsed as { error: string }).error
        : `HTTP ${res.status}`;
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return NextResponse.json(parsed);
}
