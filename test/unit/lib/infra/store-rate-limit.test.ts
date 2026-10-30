import { describe, expect, it } from "vitest";

import { createMemoryGameStore } from "@/lib/infra/game-store";
import { checkLimit, createCodeGuard } from "@/lib/infra/store-rate-limit";
import { CODE_LOCKOUT_MS, CODE_MAX_FAILURES } from "@/lib/shared-game";

function setup() {
  let clock = 1_000_000;
  const store = createMemoryGameStore({ namespace: "t", now: () => clock });
  return { store, advance: (ms: number) => (clock += ms) };
}

describe("checkLimit (REQ-0003-25)", () => {
  it("allows up to the limit in a window, then asks to retry", async () => {
    const { store, advance } = setup();
    const rule = { limit: 3, windowMs: 60_000 };
    for (let i = 0; i < 3; i += 1)
      expect(await checkLimit(store, "create:a", rule)).toEqual({ ok: true });
    expect(await checkLimit(store, "create:a", rule)).toEqual({ ok: false, retryAfterSeconds: 60 });
    expect(await checkLimit(store, "create:b", rule)).toEqual({ ok: true });
    advance(60_001);
    expect(await checkLimit(store, "create:a", rule)).toEqual({ ok: true });
  });

  it("holds across two instances that share one store", async () => {
    const { store } = setup();
    const rule = { limit: 1, windowMs: 1000 };
    // Two request handlers (separate "instances") talk to the same store.
    expect((await checkLimit(store, "k", rule)).ok).toBe(true);
    expect((await checkLimit(store, "k", rule)).ok).toBe(false);
  });
});

describe("code guard (REQ-0003-09)", () => {
  it("locks the game after five wrong codes, for everyone, for a minute", async () => {
    const { store, advance } = setup();
    const guard = createCodeGuard(store);
    for (let i = 0; i < CODE_MAX_FAILURES - 1; i += 1) {
      await guard.recordFailure("game1");
      expect(await guard.isLocked("game1")).toBe(false);
    }
    await guard.recordFailure("game1");
    expect(await guard.isLocked("game1")).toBe(true);
    expect(await guard.isLocked("game2")).toBe(false);
    advance(CODE_LOCKOUT_MS + 1);
    expect(await guard.isLocked("game1")).toBe(false);
  });

  it("counts failures only inside one window", async () => {
    const { store, advance } = setup();
    const guard = createCodeGuard(store);
    for (let i = 0; i < CODE_MAX_FAILURES - 1; i += 1) await guard.recordFailure("g");
    advance(CODE_LOCKOUT_MS + 1);
    await guard.recordFailure("g");
    expect(await guard.isLocked("g")).toBe(false);
  });
});
