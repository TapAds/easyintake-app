import axios from "axios";
import { config } from "../config";
import { getGhlClientForLocation } from "./ghl";

const GHL_HOST_MARKERS = ["leadconnectorhq.com", "gohighlevel.com", "msgsndr.com", "highlevel.com"];

export function normalizeGhlAttachmentRef(raw: unknown): string | null {
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("http://") || t.startsWith("https://")) return t;
    return null;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (typeof o.url === "string" && o.url.startsWith("http")) return o.url;
    if (typeof o.link === "string" && o.link.startsWith("http")) return o.link;
  }
  return null;
}

function urlProbablyNeedsGhlAuth(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return GHL_HOST_MARKERS.some((m) => h.includes(m));
  } catch {
    return false;
  }
}

export type FetchedAttachment = {
  buffer: Buffer;
  mimeType: string;
  byteSize: number;
};

function sniffMime(buf: Buffer): string | null {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    return "image/gif";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

function normalizeContentType(header: string | undefined): string | null {
  if (!header) return null;
  const m = header.split(";")[0]?.trim().toLowerCase();
  return m || null;
}

export const SUPPORTED_DOCUMENT_MEDIA_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/**
 * Download attachment bytes. Follows redirects (WhatsApp / CDN presigned URLs). Retries with GHL Bearer
 * when the host looks LC/GHL and open fetch fails.
 */
export async function fetchGhlAttachment(
  ghlLocationId: string,
  sourceUrl: string
): Promise<FetchedAttachment> {
  const max = config.documents.maxBytesPerFile;
  const timeout = config.documents.fetchTimeoutMs;

  const plainClient = axios.create({
    timeout,
    maxContentLength: max,
    maxBodyLength: max,
    maxRedirects: 5,
    responseType: "arraybuffer",
    validateStatus: () => true,
  });

  let res = await plainClient.get<ArrayBuffer>(sourceUrl);
  if ((res.status === 401 || res.status === 403) && urlProbablyNeedsGhlAuth(sourceUrl)) {
    const { client } = await getGhlClientForLocation(ghlLocationId);
    res = await client.get<ArrayBuffer>(sourceUrl, {
      responseType: "arraybuffer",
      timeout,
      maxContentLength: max,
      maxBodyLength: max,
      validateStatus: () => true,
    });
  }

  if (res.status >= 400) {
    throw new Error(`[attachment] HTTP ${res.status} downloading ${sourceUrl.slice(0, 120)}`);
  }

  const buf = Buffer.from(res.data);
  if (buf.length > max) {
    throw new Error(`[attachment] file exceeds DOCUMENT_MAX_BYTES (${max})`);
  }

  let mime =
    normalizeContentType(res.headers["content-type"]) ?? sniffMime(buf) ?? "application/octet-stream";

  const sniffed = sniffMime(buf);
  if (sniffed && mime === "application/octet-stream") {
    mime = sniffed;
  }

  return { buffer: buf, mimeType: mime, byteSize: buf.length };
}
