import { describe, expect, it, vi } from "vitest";

import {
  forgetGame,
  JOINED_KEY,
  keyFor,
  rememberKey,
  watchKeyFor,
} from "@/lib/infra/joined-games-storage";

const ID = "abcdefghijklmnop";
const KEY = "A".repeat(22);

describe("joined games storage (REQ-0003-04, -17)", () => {
  it("remembers a key and finds it again", () => {
    expect(keyFor(ID)).toBeNull();
    rememberKey(ID, KEY);
    expect(keyFor(ID)).toBe(KEY);
  });

  it("replaces the key for the same game and keeps others", () => {
    rememberKey(ID, KEY);
    rememberKey("bbbbbbbbbbbbbbbb", "B".repeat(22));
    rememberKey(ID, "C".repeat(22));
    expect(keyFor(ID)).toBe("C".repeat(22));
    expect(keyFor("bbbbbbbbbbbbbbbb")).toBe("B".repeat(22));
  });

  it("keeps only the newest 20 games", () => {
    for (let i = 0; i < 25; i += 1) {
      rememberKey(`game${String(i).padStart(12, "0")}`, "K".repeat(22));
    }
    const stored = JSON.parse(localStorage.getItem(JOINED_KEY) ?? "[]") as { id: string }[];
    expect(stored).toHaveLength(20);
    expect(keyFor("game000000000000")).toBeNull();
    expect(keyFor("game000000000024")).toBe("K".repeat(22));
  });

  it("forgets a game", () => {
    rememberKey(ID, KEY);
    forgetGame(ID);
    expect(keyFor(ID)).toBeNull();
  });

  it("starts empty when what is stored is not valid", () => {
    for (const bad of [
      "not json",
      JSON.stringify([{ id: "short", key: "x" }]),
      JSON.stringify({}),
    ]) {
      localStorage.setItem(JOINED_KEY, bad);
      expect(keyFor(ID)).toBeNull();
    }
  });

  it("works when storage is missing or throws", () => {
    expect(keyFor(ID, undefined)).toBeNull();
    expect(() => {
      rememberKey(ID, KEY, undefined);
    }).not.toThrow();
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(keyFor(ID, broken)).toBeNull();
    expect(() => {
      rememberKey(ID, KEY, broken);
    }).not.toThrow();
  });
});

describe("the watch key a host keeps (SPEC-0003 REQ-0003-02)", () => {
  const WATCH = "W".repeat(22);
  const EDIT = "E".repeat(22);

  it("is saved beside the key and found again", () => {
    expect(watchKeyFor(ID)).toBeNull();
    rememberKey(ID, EDIT, undefined, WATCH);
    expect(keyFor(ID)).toBe(EDIT);
    expect(watchKeyFor(ID)).toBe(WATCH);
  });

  it("opening your own watch link does not replace your edit key", () => {
    rememberKey(ID, EDIT, undefined, WATCH);
    rememberKey(ID, WATCH);
    expect(keyFor(ID)).toBe(EDIT);
  });

  it("keeps the watch key when the key changes, as when a watcher becomes an editor", () => {
    rememberKey(ID, WATCH);
    rememberKey(ID, EDIT, undefined, WATCH);
    expect(keyFor(ID)).toBe(EDIT);
    expect(watchKeyFor(ID)).toBe(WATCH);
  });

  it("older saved entries, with no watch key, still load", () => {
    localStorage.setItem(JOINED_KEY, JSON.stringify([{ id: ID, key: EDIT }]));
    expect(keyFor(ID)).toBe(EDIT);
    expect(watchKeyFor(ID)).toBeNull();
  });
});
