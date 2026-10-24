import { describe, expect, it } from "vitest";

import { createRateLimiter } from "@/lib/infra/rate-limit";

describe("createRateLimiter", () => {
  it("REQ-0001-15: allows `limit` hits per window, then reports when to retry", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.check("a", 0)).toEqual({ ok: true });
    expect(limiter.check("a", 1_000)).toEqual({ ok: true });
    expect(limiter.check("a", 2_000)).toEqual({ ok: false, retryAfterSeconds: 58 });
    expect(limiter.check("b", 2_000)).toEqual({ ok: true });
    expect(limiter.check("a", 60_000)).toEqual({ ok: true });
  });

  it("evicts the oldest key when full", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 1 });
    limiter.check("a", 0);
    limiter.check("b", 0);
    expect(limiter.check("a", 1)).toEqual({ ok: true });
  });
});
