/**
 * Fixed-window rate limiter keyed by client. State is per server instance: it slows abuse from
 * one client on one instance but is not a shared limit (see SPEC-0001 §7 before enabling the
 * photo route publicly). Keys are bounded; the oldest window is evicted first.
 */

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export type RateLimiter = {
  /** Counts one hit and says whether it is allowed. */
  check(key: string, now?: number): RateLimitResult;
  /** Says whether the next hit would be allowed, without counting one. */
  peek(key: string, now?: number): RateLimitResult;
};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs, maxKeys = 10_000 } = options;
  const windows = new Map<string, { start: number; hits: number }>();

  const refusal = (start: number, now: number): RateLimitResult => ({
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((start + windowMs - now) / 1000)),
  });

  return {
    peek(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs || current.hits < limit) return { ok: true };
      return refusal(current.start, now);
    },
    check(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        windows.delete(key);
        if (windows.size >= maxKeys) {
          const oldest = windows.keys().next();
          if (!oldest.done) windows.delete(oldest.value);
        }
        windows.set(key, { start: now, hits: 1 });
        return { ok: true };
      }
      if (current.hits >= limit) return refusal(current.start, now);
      current.hits += 1;
      return { ok: true };
    },
  };
}
