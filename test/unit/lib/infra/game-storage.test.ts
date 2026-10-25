import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSavedGame, saveGame, STORAGE_KEY } from "@/lib/infra/game-storage";
import { defaultGame } from "@/test/unit/fixtures";

describe("game storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("REQ-0001-25: saves under chip-ledger.v1 and restores the same game", () => {
    const game = { ...defaultGame(), screen: "table" as const };
    saveGame(game);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(game));
    expect(loadSavedGame()).toEqual(game);
  });

  it("REQ-0001-26: returns null when nothing is saved", () => {
    expect(loadSavedGame()).toBeNull();
  });

  it("AC-0001-11: rejects invalid or non-JSON saved state and logs it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, '{"players":"oops"}');
    expect(loadSavedGame()).toBeNull();
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadSavedGame()).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("REQ-0001-26: survives storage that throws or is missing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const broken = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    } as unknown as Storage;
    expect(loadSavedGame(broken)).toBeNull();
    expect(() => {
      saveGame(defaultGame(), broken);
    }).not.toThrow();
    expect(error).toHaveBeenCalledTimes(2);
    expect(loadSavedGame(undefined)).toBeNull();
  });
});
