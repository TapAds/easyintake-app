import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIPv4(ip: string): boolean {
  if (ip === "127.0.0.1" || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("169.254.")) return true;
  const m = /^172\.(\d+)\./.exec(ip);
  if (m) {
    const oct = Number(m[1]);
    if (oct >= 16 && oct <= 31) return true;
  }
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" ||
    lower.startsWith("fe80:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd")
  );
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".local")) return true;
  if (net.isIP(h)) {
    return net.isIPv4(h) ? isPrivateIPv4(h) : isPrivateIPv6(h);
  }
  return false;
}

/**
 * Throws if the URL must not be fetched server-side (SSRF mitigation).
 * Validates initial URL; call again with `response.url` after redirects.
 */
export async function assertUrlSafeForServerFetch(href: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("UNSUPPORTED_PROTOCOL");
  }
  if (process.env.NODE_ENV === "production" && u.protocol !== "https:") {
    throw new Error("HTTPS_REQUIRED");
  }
  if (isBlockedHost(u.hostname)) {
    throw new Error("BLOCKED_HOST");
  }
  if (!net.isIP(u.hostname)) {
    try {
      const result = await dns.lookup(u.hostname);
      const addr = typeof result === "string" ? result : result.address;
      if (net.isIP(addr)) {
        if (net.isIPv4(addr) ? isPrivateIPv4(addr) : isPrivateIPv6(addr)) {
          throw new Error("BLOCKED_HOST");
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message === "BLOCKED_HOST") throw e;
      throw new Error("DNS_FAILED");
    }
  }
  return u;
}
