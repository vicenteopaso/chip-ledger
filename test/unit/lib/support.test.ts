import { afterEach, describe, expect, it, vi } from "vitest";

import { problemBody } from "@/lib/api-problem";
import { logError, logWarning } from "@/lib/error-logging";
import { clientKey, isSameOrigin } from "@/lib/request-guards";
import { contentSecurityPolicy, SECURITY_HEADERS } from "@/lib/security-headers";
import { pageMetadata, robotsRules, SITE, sitemapEntries } from "@/lib/seo";

describe("problemBody", () => {
  it("includes the request id only when there is one", () => {
    expect(problemBody(404, "not_found", "Not found.")).toEqual({
      type: "not_found",
      title: "Not found.",
      status: 404,
    });
    expect(problemBody(400, "x", "y", "r1").requestId).toBe("r1");
  });
});

describe("request guards", () => {
  it("REQ-0001-15: accepts only a matching Origin", () => {
    expect(isSameOrigin("https://chips.example", "https://chips.example/api/photo-count")).toBe(
      true,
    );
    expect(isSameOrigin("https://evil.example", "https://chips.example/api/photo-count")).toBe(
      false,
    );
    expect(isSameOrigin(null, "https://chips.example/api")).toBe(false);
    expect(isSameOrigin("not a url", "https://chips.example/api")).toBe(false);
  });

  it("keys clients by the first forwarded hop", () => {
    expect(clientKey("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
    expect(clientKey(null)).toBe("unknown");
  });
});

describe("error logging", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes structured JSON with context and redacts sensitive keys", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logError(new TypeError("boom"), { context: "test", apiKey: "secret-value", requestId: "r1" });
    const entry = JSON.parse(String(spy.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(entry).toMatchObject({
      level: "error",
      context: "test",
      apiKey: "[redacted]",
      requestId: "r1",
    });
    expect(entry.error).toMatchObject({ name: "TypeError", message: "boom" });
  });

  it("normalizes non-Error values and logs warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logError("plain", { context: "test" });
    logWarning("careful", { context: "test" });
    expect(String(error.mock.calls[0]?.[0])).toContain('"message":"plain"');
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toEqual({
      level: "warn",
      message: "careful",
      context: "test",
    });
  });
});

describe("security headers", () => {
  it("builds a nonce CSP without third-party origins, eval only in development", () => {
    const csp = contentSecurityPolicy("abc", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy("abc", true)).toContain("'unsafe-eval'");
    expect(SECURITY_HEADERS.map((h) => h.key)).toContain("Strict-Transport-Security");
  });
});

describe("seo", () => {
  it("REQ-0001-31: names both copyright holders, matching the LICENSE", () => {
    expect(SITE.copyrightHolders).toBe("Jason Johnson and Vicente Opaso");
  });

  it("builds canonical metadata, sitemap and robots from one site URL", () => {
    const meta = pageMetadata({ siteUrl: "https://chips.example", path: "/" });
    expect(meta.alternates.canonical).toBe("https://chips.example/");
    expect(meta.title).toBe("Chip Ledger");
    expect(sitemapEntries("https://chips.example")).toEqual([{ url: "https://chips.example/" }]);
    expect(robotsRules("https://chips.example")).toEqual({
      rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
      sitemap: "https://chips.example/sitemap.xml",
    });
  });
});
