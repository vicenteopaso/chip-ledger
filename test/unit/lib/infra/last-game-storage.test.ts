import { beforeEach, describe, expect, it, vi } from "vitest";

import { LAST_GAME_KEY, lastGame, rememberLastGame } from "@/lib/infra/last-game-storage";

const ID = "abcdefghijklmnop";

beforeEach(() => {
  localStorage.clear();
});

describe("last game storage (REQ-0006-01)", () => {
  it("is the device's own game until something is recorded", () => {
    expect(lastGame()).toEqual({ kind: "own" });
  });

  it("remembers a shared game, then the device's own game again", () => {
    rememberLastGame({ kind: "shared", id: ID });
    expect(lastGame()).toEqual({ kind: "shared", id: ID });
    rememberLastGame({ kind: "own" });
    expect(lastGame()).toEqual({ kind: "own" });
  });

  it("never stores a key, only the game id", () => {
    rememberLastGame({ kind: "shared", id: ID });
    expect(localStorage.getItem(LAST_GAME_KEY)).toBe(JSON.stringify({ kind: "shared", id: ID }));
  });

  it("treats text that isn't JSON, or isn't a valid record, as the device's own game", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const text of [
      "{nope",
      '{"kind":"shared","id":"short"}',
      '{"kind":"shared","id":"abcdefghijklmnop","key":"x"}',
    ]) {
      localStorage.setItem(LAST_GAME_KEY, text);
      expect(lastGame()).toEqual({ kind: "own" });
    }
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });

  it("survives storage that throws", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    expect(lastGame(broken)).toEqual({ kind: "own" });
    expect(() => {
      rememberLastGame({ kind: "own" }, broken);
    }).not.toThrow();
    expect(error).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
