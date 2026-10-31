import { describe, expect, it } from "vitest";

import { gameTitle } from "@/lib/games-list";
import { defaultGame } from "@/test/unit/fixtures";

const named = (names: string[], count = names.length) => {
  const game = defaultGame();
  return {
    ...game,
    count: Math.max(count, 2),
    players: game.players.map((player, index) => ({ ...player, name: names[index] ?? "" })),
  };
};

describe("gameTitle (SPEC-0003 REQ-0003-17)", () => {
  it("is the players' names", () => {
    expect(gameTitle(named(["Ana", "Ben"]))).toBe("Ana, Ben");
    expect(gameTitle(named(["Ana", "Ben", "Cy"]))).toBe("Ana, Ben, Cy");
  });

  it("shortens a long list", () => {
    expect(gameTitle(named(["Ana", "Ben", "Cy", "Dee", "Eve"], 5))).toBe("Ana, Ben, Cy and 2 more");
  });

  it("skips blank names, and falls back to the player count", () => {
    expect(gameTitle(named(["Ana", "", "Cy"], 3))).toBe("Ana, Cy");
    expect(gameTitle(named([], 4))).toBe("Game with 4 players");
  });

  it("does not count names of players who are not in the game", () => {
    const game = named(["Ana", "Ben"], 2);
    expect(
      gameTitle({
        ...game,
        players: game.players.map((p, i) => (i === 5 ? { ...p, name: "Zed" } : p)),
      }),
    ).toBe("Ana, Ben");
  });

  it("keeps a very long name short", () => {
    expect(gameTitle(named(["x".repeat(200), "y"])).length).toBeLessThanOrEqual(80);
  });
});
