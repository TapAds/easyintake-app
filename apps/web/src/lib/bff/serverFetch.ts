import "server-only";
import type { IntakeSession, IntakeSessionListRow } from "@easy-intake/shared";
import { headers } from "next/headers";

function sameOriginBffHeaders(h: Headers): HeadersInit {
  const cookie = h.get("cookie");
  return cookie ? { cookie } : {};
}

/**
 * Server-side fetch to the BFF intake session stub (same origin).
 */
export async function fetchIntakeSessionFromBff(
  sessionId: string
): Promise<IntakeSession | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/api/intake/sessions/${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: sameOriginBffHeaders(h),
  });
  if (!res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || !("sessionId" in body)) {
    return null;
  }
  const sid = (body as { sessionId: unknown }).sessionId;
  if (typeof sid !== "string" || !sid) {
    return null;
  }
  const raw = body as IntakeSession & { channels?: unknown; fieldValues?: unknown };
  const channels = Array.isArray(raw.channels) ? raw.channels : [];
  const fieldValues =
    raw.fieldValues &&
    typeof raw.fieldValues === "object" &&
    !Array.isArray(raw.fieldValues)
      ? raw.fieldValues
      : {};
  return { ...raw, channels, fieldValues };
}

/**
 * Server-side list session fetch (same pattern as queue table; forwards session cookie).
 */
export async function fetchIntakeSessionsListFromBff(): Promise<
  IntakeSessionListRow[] | null
> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/api/intake/sessions`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: sameOriginBffHeaders(h),
  });
  if (!res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (!Array.isArray(body)) return null;
  return body as IntakeSessionListRow[];
}
