import { describe, expect, it } from "vitest";

import { createMemoryGameStore, parseStoredGame, PRESENCE_WINDOW_MS } from "@/lib/infra/game-store";
import { RECORD_TTL_SECONDS } from "@/lib/shared-game";
import { gameDoc, runGameStoreContract } from "@/test/unit/lib/infra/game-store-contract";

function memoryHarness() {
  let clock = 1_800_000_000_000;
  const store = createMemoryGameStore({ namespace: "test", now: () => clock });
  return { store, advance: (ms: number) => (clock += ms) };
}

runGameStoreContract("in memory", memoryHarness);

describe("in-memory store expiry (REQ-0003-21)", () => {
  it("forgets a game after 24 hours plus 30 days without activity", async () => {
    const { store, advance } = memoryHarness();
    const doc = gameDoc();
    await store.create(doc);
    advance(RECORD_TTL_SECONDS * 1000 - 1);
    expect(await store.get(doc.id)).not.toBeNull();
    advance(2);
    expect(await store.get(doc.id)).toBeNull();
  });

  it("a heartbeat keeps the game alive", async () => {
    const { store, advance } = memoryHarness();
    const doc = gameDoc();
    await store.create(doc);
    advance(RECORD_TTL_SECONDS * 1000 - 1000);
    await store.heartbeat(doc.id, "device", Date.now());
    advance(2000);
    expect(await store.get(doc.id)).not.toBeNull();
  });

  it("counters and flags expire", async () => {
    const { store, advance } = memoryHarness();
    await store.incr("c", 1000);
    await store.incr("c", 1000);
    advance(1001);
    expect(await store.incr("c", 1000)).toBe(1);
    await store.setFlag("f", 500);
    advance(501);
    expect(await store.hasFlag("f")).toBe(false);
  });

  it("drops devices after the presence window", async () => {
    const { store, advance } = memoryHarness();
    const doc = gameDoc();
    await store.create(doc);
    const start = 5_000_000;
    await store.heartbeat(doc.id, "device", start);
    advance(1);
    expect(await store.onlineCount(doc.id, start + PRESENCE_WINDOW_MS)).toBe(1);
    expect(await store.onlineCount(doc.id, start + PRESENCE_WINDOW_MS + 1)).toBe(0);
  });
});

describe("parseStoredGame", () => {
  it("returns null for missing, non-JSON, and invalid records", () => {
    expect(parseStoredGame(null)).toBeNull();
    expect(parseStoredGame("not json")).toBeNull();
    expect(parseStoredGame(JSON.stringify({ id: "x" }))).toBeNull();
  });
});
