/**
 * Extract candidate logo URLs from HTML (order: og:image, touch icon, icons, favicon).
 */
export function extractLogoCandidates(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (href: string | undefined) => {
    if (!href?.trim()) return;
    const abs = resolveUrl(href.trim(), base);
    if (abs && !seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  };

  const og =
    html.match(
      /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ) ||
    html.match(
      /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i,
    );
  if (og?.[1]) push(og[1]);

  const apple =
    html.match(
      /<link\s+[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    ) ||
    html.match(
      /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["'][^>]*>/i,
    );
  if (apple?.[1]) push(apple[1]);

  const linkRe = /<link\s+[^>]*>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkRe.exec(html)) !== null) {
    const tag = linkMatch[0];
    const relMatch = tag.match(/rel=["']([^"']+)["']/i);
    if (!relMatch?.[1]) continue;
    const rel = relMatch[1].toLowerCase();
    if (
      rel === "icon" ||
      rel === "shortcut icon" ||
      rel === "apple-touch-icon-precomposed"
    ) {
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (hrefMatch?.[1]) push(hrefMatch[1]);
    }
  }

  push(new URL("/favicon.ico", base).href);

  return out;
}

function resolveUrl(href: string, base: URL): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}
