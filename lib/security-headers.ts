/** Security headers in one place (sdd.yaml `security.headers`, docs/SECURITY_POLICY.md §5). */

/** Static headers for every response; applied by next.config.mjs. */
export const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // The photo picker is a file input, so the page needs none of these device APIs.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
] as const;

/**
 * Per-request CSP. Next.js reads the nonce from this header and applies it to its own inline
 * scripts. `blob:` images are the local photo thumbnails. `unsafe-eval` only in development,
 * where React uses eval for error overlays.
 */
export function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
