import { logWarning } from "@/lib/error-logging";
import { RECORD_TTL_SECONDS, type StoredGame, StoredGameSchema } from "@/lib/shared-game";

/**
 * Where shared games live (ADR-0005). Two adapters implement it: in memory (development, tests,
 * and the contract test's reference) and Upstash Redis over REST (`upstash-game-store.ts`).
 * Handlers hold no state of their own, so any instance can serve any request (sdd.yaml
 * `prohibited`).
 */
export type GameStore = {
  /** Stores a new game; false when the id is taken. */
  create(doc: StoredGame): Promise<boolean>;
  get(id: string): Promise<StoredGame | null>;
  /** Replaces the game only if its stored revision is `expectedRev` (compare-and-set). */
  compareAndSet(doc: StoredGame, expectedRev: number): Promise<boolean>;
  /** Marks a device as connected now: refreshes `seenAt`, presence, and the record's lifetime. */
  heartbeat(id: string, connectionId: string, now: number): Promise<void>;
  /** The last time any device was connected, in ms, or null. */
  seenAt(id: string): Promise<number | null>;
  /** Devices that sent a heartbeat in the last `PRESENCE_WINDOW_MS`. */
  onlineCount(id: string, now: number): Promise<number>;
  remove(id: string): Promise<void>;
  /** Adds one to a counter that expires `windowMs` after its first use; returns the new count. */
  incr(name: string, windowMs: number): Promise<number>;
  setFlag(name: string, ttlMs: number): Promise<void>;
  hasFlag(name: string): Promise<boolean>;
};

/** A device counts as online for this long after its last heartbeat. */
export const PRESENCE_WINDOW_MS = 45_000;

export function parseStoredGame(text: string | null): StoredGame | null {
  if (text === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logWarning("Stored game is not JSON", { context: "game-store.get" });
    return null;
  }
  const parsed = StoredGameSchema.safeParse(json);
  if (!parsed.success) {
    logWarning("Stored game failed validation", {
      context: "game-store.get",
      issues: parsed.error.issues.length,
    });
    return null;
  }
  return parsed.data;
}

type Entry = { value: string; expiresAt: number };

/**
 * An in-memory store with the same behaviour as the Redis one, including expiry. `now` is
 * injectable so lifecycle tests need no real waiting. State lives in this process only.
 */
export function createMemoryGameStore(options: {
  namespace: string;
  now?: () => number;
}): GameStore {
  const { namespace, now = Date.now } = options;
  const entries = new Map<string, Entry>();
  const presence = new Map<string, Map<string, number>>();
  const key = (...parts: string[]) => [namespace, ...parts].join(":");

  const read = (name: string): string | null => {
    const entry = entries.get(name);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      entries.delete(name);
      return null;
    }
    return entry.value;
  };
  const write = (name: string, value: string, ttlMs: number) => {
    entries.set(name, { value, expiresAt: now() + ttlMs });
  };
  const ttlMs = RECORD_TTL_SECONDS * 1000;

  return {
    create(doc) {
      const name = key("game", doc.id);
      if (read(name) !== null) return Promise.resolve(false);
      write(name, JSON.stringify(doc), ttlMs);
      return Promise.resolve(true);
    },
    get(id) {
      return Promise.resolve(parseStoredGame(read(key("game", id))));
    },
    compareAndSet(doc, expectedRev) {
      const name = key("game", doc.id);
      const current = parseStoredGame(read(name));
      if (!current || current.rev !== expectedRev) return Promise.resolve(false);
      write(name, JSON.stringify(doc), ttlMs);
      return Promise.resolve(true);
    },
    heartbeat(id, connectionId, at) {
      const name = key("game", id);
      const current = read(name);
      if (current === null) return Promise.resolve();
      write(name, current, ttlMs);
      write(key("seen", id), String(at), ttlMs);
      const devices = presence.get(id) ?? new Map<string, number>();
      devices.set(connectionId, at);
      for (const [device, seen] of devices) {
        if (seen < at - PRESENCE_WINDOW_MS) devices.delete(device);
      }
      presence.set(id, devices);
      return Promise.resolve();
    },
    seenAt(id) {
      const value = read(key("seen", id));
      return Promise.resolve(value === null ? null : Number(value));
    },
    onlineCount(id, at) {
      const devices = presence.get(id);
      if (!devices) return Promise.resolve(0);
      let count = 0;
      for (const seen of devices.values()) if (seen >= at - PRESENCE_WINDOW_MS) count += 1;
      return Promise.resolve(count);
    },
    remove(id) {
      entries.delete(key("game", id));
      entries.delete(key("seen", id));
      presence.delete(id);
      return Promise.resolve();
    },
    incr(name, windowMs) {
      const counter = key("count", name);
      const next = Number(read(counter) ?? "0") + 1;
      const existing = entries.get(counter);
      entries.set(counter, {
        value: String(next),
        expiresAt: existing && existing.expiresAt > now() ? existing.expiresAt : now() + windowMs,
      });
      return Promise.resolve(next);
    },
    setFlag(name, flagTtlMs) {
      write(key("flag", name), "1", flagTtlMs);
      return Promise.resolve();
    },
    hasFlag(name) {
      return Promise.resolve(read(key("flag", name)) !== null);
    },
  };
}
