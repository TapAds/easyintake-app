/**
 * Resolves the API-hosted agent console URL. Static file is served at /public/agent.html on apps/api.
 */
export function resolveAgentHtmlPageUrl(base: string): string {
  const b = base.trim().replace(/\/$/, "");
  if (b.endsWith("agent.html")) return b;
  return `${b}/public/agent.html`;
}

export function buildAgentHtmlUrl(
  base: string | undefined,
  params?: { callSid?: string; token?: string }
): string | null {
  if (!base?.trim()) return null;
  let url: URL;
  try {
    url = new URL(resolveAgentHtmlPageUrl(base));
  } catch {
    return null;
  }
  if (params?.callSid) url.searchParams.set("callSid", params.callSid);
  if (params?.token) url.searchParams.set("token", params.token);
  return url.toString();
}
