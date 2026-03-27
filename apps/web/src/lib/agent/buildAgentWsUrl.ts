/**
 * Builds WebSocket URL for apps/api /ws/agent (browser-safe).
 */
export function buildAgentWsUrl(
  apiHttpBase: string,
  token: string,
  callSid: string
): string | null {
  if (!apiHttpBase.trim()) return null;
  try {
    const u = new URL(apiHttpBase.trim().replace(/\/$/, ""));
    const wsProto = u.protocol === "https:" ? "wss:" : "ws:";
    const ws = new URL(`${wsProto}//${u.host}/ws/agent`);
    ws.searchParams.set("token", token);
    ws.searchParams.set("callSid", callSid.trim());
    return ws.toString();
  } catch {
    return null;
  }
}
