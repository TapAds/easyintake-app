/**
 * Builds a shareable URL with query params.
 * Vertical-agnostic.
 */
export interface ShareableUrlParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Appends params to a base URL as query string.
 * Filters out undefined values.
 */
export function buildShareableUrl(
  base: string,
  params: ShareableUrlParams
): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}
