/** Transport-level checks shared by route handlers. Pure functions over header values. */

/** True only when the browser-sent Origin matches the origin the request was made to. */
export function isSameOrigin(originHeader: string | null, requestUrl: string): boolean {
  if (!originHeader) return false;
  try {
    return new URL(originHeader).origin === new URL(requestUrl).origin;
  } catch {
    // A malformed Origin header is treated as cross-origin.
    return false;
  }
}

/**
 * Rate-limit key for a client: the first `x-forwarded-for` hop, which the hosting platform
 * sets and overwrites (docs/API_PATTERNS.md §4).
 */
export function clientKey(forwardedFor: string | null): string {
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
