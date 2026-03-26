import "server-only";
import type { IntakeSession } from "@easy-intake/shared";
import { headers } from "next/headers";

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
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as IntakeSession;
}
