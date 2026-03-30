import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { userCanEditOrganizationProfile } from "@/lib/auth/roles";
import { extractLogoCandidates } from "@/lib/settings/discoverLogo";
import {
  ALLOWED_LOGO_IMAGE_TYPES,
  MAX_HTML_BYTES,
  MAX_LOGO_BYTES,
  normalizeWebsiteInput,
  validateWebsiteForStorage,
} from "@/lib/settings/orgProfile";
import { assertUrlSafeForServerFetch } from "@/lib/settings/urlSafety";

async function fetchWithLimits(
  url: string,
): Promise<{ buf: ArrayBuffer; contentType: string; finalUrl: string }> {
  await assertUrlSafeForServerFetch(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "EasyIntake-OrgLogo/1.0",
        Accept: "*/*",
      },
    });
    clearTimeout(timer);
    await assertUrlSafeForServerFetch(res.url);
    const maxBytes = Math.max(MAX_HTML_BYTES, MAX_LOGO_BYTES);
    const len = res.headers.get("content-length");
    if (len && Number(len) > maxBytes) {
      throw new Error("TOO_LARGE");
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) {
      throw new Error("TOO_LARGE");
    }
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    return { buf, contentType, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!(await userCanEditOrganizationProfile())) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "NO_ORG" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const websiteUrlRaw = (body as Record<string, unknown>).websiteUrl;
  if (typeof websiteUrlRaw !== "string") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const normalizedStore = validateWebsiteForStorage(websiteUrlRaw);
  if (normalizedStore === null || normalizedStore === "") {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const pageUrl = normalizeWebsiteInput(websiteUrlRaw);

  try {
    const htmlRes = await fetchWithLimits(pageUrl);
    if (!htmlRes.contentType.includes("html")) {
      return NextResponse.json({ error: "NOT_HTML" }, { status: 400 });
    }
    const html = Buffer.from(htmlRes.buf).toString("utf8", 0, Math.min(htmlRes.buf.byteLength, MAX_HTML_BYTES));
    const candidates = extractLogoCandidates(html, htmlRes.finalUrl);

    let lastError = "NO_IMAGE";
    for (const imageUrl of candidates) {
      try {
        const imgRes = await fetchWithLimits(imageUrl);
        if (!ALLOWED_LOGO_IMAGE_TYPES.has(imgRes.contentType)) {
          lastError = "BAD_IMAGE_TYPE";
          continue;
        }
        if (imgRes.buf.byteLength > MAX_LOGO_BYTES) {
          lastError = "TOO_LARGE";
          continue;
        }
        const base64 = Buffer.from(imgRes.buf).toString("base64");
        return NextResponse.json({
          mimeType: imgRes.contentType,
          dataBase64: base64,
          sourceUrl: imageUrl,
        });
      } catch {
        lastError = "FETCH_IMAGE_FAILED";
        continue;
      }
    }

    return NextResponse.json({ error: lastError }, { status: 404 });
  } catch (err: unknown) {
    const code =
      err instanceof Error && err.name === "AbortError"
        ? "TIMEOUT"
        : err instanceof Error && err.message === "TOO_LARGE"
          ? "TOO_LARGE"
          : "FETCH_FAILED";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
