import { describe, expect, it } from "vitest";

import type { GameStore } from "@/lib/infra/game-store";
import { PRESENCE_WINDOW_MS } from "@/lib/infra/game-store";
import { CreateGameRequestSchema, createStoredGame, type StoredGame } from "@/lib/shared-game";
import { defaultGame } from "@/test/unit/fixtures";

/**
 * One contract every store adapter must meet (SPEC-0003 T-08). The in-memory adapter runs it in
 * CI; the Upstash adapter runs it by hand against a real database (see the live test file).
 */
export type StoreHarness = {
  store: GameStore;
  /** Moves the clock the store uses for expiry, when it has one. Absent for a real database. */
  advance?: (ms: number) => void;
  cleanup?: () => Promise<void>;
};

let seq = 0;
export function gameDoc(): StoredGame {
  seq += 1;
  const request = CreateGameRequestSchema.parse({ started: false, game: defaultGame() });
  const doc = createStoredGame({
    id: `contract${String(Date.now())}${String(seq)}`.slice(-16).padStart(16, "x"),
    request,
    watchKeyHash: "a".repeat(64),
    editKeyHash: "b".repeat(64),
    now: Date.now(),
  });
  if (!doc) throw new Error("fixture too large");
  return doc;
}

export function runGameStoreContract(
  name: string,
  make: () => Promise<StoreHarness> | StoreHarness,
) {
  describe(`game store contract: ${name}`, () => {
    it("creates once and reads back the same game", async () => {
      const { store, cleanup } = await make();
      const doc = gameDoc();
      expect(await store.create(doc)).toBe(true);
      expect(await store.create(doc)).toBe(false);
      expect(await store.get(doc.id)).toEqual(doc);
      expect(await store.get("missing-missing-1")).toBeNull();
      await store.remove(doc.id);
      await cleanup?.();
    });

    it("REQ-0003-10: compare-and-set writes only on the expected revision", async () => {
      const { store, cleanup } = await make();
      const doc = gameDoc();
      await store.create(doc);
      const next = { ...doc, rev: 1 };
      expect(await store.compareAndSet(next, 0)).toBe(true);
      // A second writer that read revision 0 loses.
      expect(await store.compareAndSet({ ...doc, rev: 1, started: true }, 0)).toBe(false);
      expect((await store.get(doc.id))?.started).toBe(false);
      expect(await store.compareAndSet({ ...next, rev: 2 }, 1)).toBe(true);
      expect(await store.compareAndSet({ ...gameDoc(), rev: 1 }, 0)).toBe(false);
      await store.remove(doc.id);
      await cleanup?.();
    });

    it("REQ-0003-13, -19: heartbeats set seenAt and count online devices", async () => {
      const { store, cleanup } = await make();
      const doc = gameDoc();
      await store.create(doc);
      expect(await store.seenAt(doc.id)).toBeNull();
      expect(await store.onlineCount(doc.id, 10_000)).toBe(0);
      await store.heartbeat(doc.id, "device-a", 10_000);
      await store.heartbeat(doc.id, "device-b", 11_000);
      await store.heartbeat(doc.id, "device-a", 12_000);
      expect(await store.seenAt(doc.id)).toBe(12_000);
      expect(await store.onlineCount(doc.id, 12_000)).toBe(2);
      expect(await store.onlineCount(doc.id, 11_000 + PRESENCE_WINDOW_MS + 1)).toBe(1);
      expect(await store.onlineCount(doc.id, 12_000 + PRESENCE_WINDOW_MS + 1)).toBe(0);
      await store.remove(doc.id);
      await cleanup?.();
    });

    it("ignores heartbeats for a game that does not exist", async () => {
      const { store, cleanup } = await make();
      await store.heartbeat("nothere-nothere1", "device", 5);
      expect(await store.seenAt("nothere-nothere1")).toBeNull();
      await cleanup?.();
    });

    it("REQ-0003-21: removing a game removes everything about it", async () => {
      const { store, cleanup } = await make();
      const doc = gameDoc();
      await store.create(doc);
      await store.heartbeat(doc.id, "device", 100);
      await store.remove(doc.id);
      expect(await store.get(doc.id)).toBeNull();
      expect(await store.seenAt(doc.id)).toBeNull();
      expect(await store.onlineCount(doc.id, 100)).toBe(0);
      await cleanup?.();
    });

    it("REQ-0003-25: counters count within a window", async () => {
      const { store, cleanup } = await make();
      const name = `limit-${String(Date.now())}-${String(seq)}`;
      expect(await store.incr(name, 60_000)).toBe(1);
      expect(await store.incr(name, 60_000)).toBe(2);
      expect(await store.incr(name, 60_000)).toBe(3);
      await cleanup?.();
    });

    it("REQ-0003-09: flags are set and read", async () => {
      const { store, cleanup } = await make();
      const name = `flag-${String(Date.now())}-${String(seq)}`;
      expect(await store.hasFlag(name)).toBe(false);
      await store.setFlag(name, 60_000);
      expect(await store.hasFlag(name)).toBe(true);
      await cleanup?.();
    });
  });
}
