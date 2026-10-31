import { describe, expect, it, vi } from "vitest";

import {
  forgetGame,
  JOINED_KEY,
  keyFor,
  listGames,
  rememberKey,
  stepFor,
  updateGame,
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

describe("the Games list on this device (SPEC-0003 REQ-0003-17, -18)", () => {
  const A = "aaaaaaaaaaaaaaaa";
  const B = "bbbbbbbbbbbbbbbb";

  it("lists the joined games, the one opened last first", () => {
    rememberKey(A, "A".repeat(22));
    rememberKey(B, "B".repeat(22));
    updateGame(A, { visited: 10 });
    updateGame(B, { visited: 20 });
    expect(listGames().map((game) => game.id)).toEqual([B, A]);
    updateGame(A, { visited: 30 });
    expect(listGames().map((game) => game.id)).toEqual([A, B]);
  });

  it("keeps a game's name, role and step, and does not invent an entry", () => {
    rememberKey(A, "A".repeat(22));
    updateGame(A, { title: "Ana, Ben", role: "watch", step: "settle" });
    updateGame(B, { title: "Nobody" });
    expect(listGames()).toHaveLength(1);
    expect(listGames()[0]).toMatchObject({ title: "Ana, Ben", role: "watch", step: "settle" });
    expect(stepFor(A)).toBe("settle");
    expect(stepFor(B)).toBeNull();
  });

  it("keeps what it knows about a game when the key changes (a watcher becomes an editor)", () => {
    rememberKey(A, "W".repeat(22));
    updateGame(A, { title: "Ana, Ben", step: "cashout" });
    rememberKey(A, "E".repeat(22), undefined, "W".repeat(22));
    expect(listGames()[0]).toMatchObject({
      key: "E".repeat(22),
      watchKey: "W".repeat(22),
      title: "Ana, Ben",
      step: "cashout",
    });
  });

  it("leaving a game removes it from the list on this device only", () => {
    rememberKey(A, "A".repeat(22));
    rememberKey(B, "B".repeat(22));
    forgetGame(A);
    expect(listGames().map((game) => game.id)).toEqual([B]);
  });

  it("ignores a stored step it does not know", () => {
    localStorage.setItem(
      JOINED_KEY,
      JSON.stringify([{ id: A, key: "A".repeat(22), step: "nope" }]),
    );
    expect(listGames()).toEqual([]);
  });
});
