import { describe, expect, it } from "vitest";

import {
  activePlayers,
  canStartGame,
  cashOutRate,
  cashOutValue,
  countedChips,
  countedValue,
  createGame,
  GameStateSchema,
  issuedChips,
  playerName,
  pot,
  stackValue,
  totalBuyins,
} from "@/lib/game";
import { randomId, sequentialIds } from "@/lib/ids";
import { defaultGame, gameWith } from "@/test/unit/fixtures";

describe("createGame", () => {
  it("REQ-0001-26: defaults to 4 players, 20 USD, spread on, white/red/blue chips", () => {
    const game = createGame(sequentialIds("x"));
    expect(game).toMatchObject({
      screen: "setup",
      count: 4,
      buyIn: 20,
      currency: "USD",
      scale: true,
    });
    expect(game.players).toHaveLength(6);
    expect(game.players.every((p) => p.buyins === 1 && p.name === "")).toBe(true);
    expect(game.chips.map((c) => [c.color, c.count, c.value])).toEqual([
      ["white", 20, 0.25],
      ["red", 10, 0.5],
      ["blue", 10, 1],
    ]);
    expect(GameStateSchema.safeParse(game).success).toBe(true);
  });

  it("gives every player and chip a distinct id", () => {
    const game = createGame(randomId);
    const ids = [...game.players, ...game.chips].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("GameStateSchema", () => {
  it("REQ-0001-28: games saved before the same-value option load with it off", () => {
    const older: Record<string, unknown> = { ...defaultGame() };
    delete older.uniformValue;
    const parsed = GameStateSchema.safeParse(older);
    expect(parsed.success && parsed.data.uniformValue).toBe(false);
  });

  it("REQ-0001-26: rejects duplicate chip colors", () => {
    const game = defaultGame();
    const chips = game.chips.map((chip) => ({ ...chip, color: "red" as const }));
    expect(GameStateSchema.safeParse({ ...game, chips }).success).toBe(false);
  });

  it("REQ-0001-26: rejects a player count outside 4–6 and a wrong number of slots", () => {
    const game = defaultGame();
    expect(GameStateSchema.safeParse({ ...game, count: 7 }).success).toBe(false);
    expect(GameStateSchema.safeParse({ ...game, players: game.players.slice(0, 5) }).success).toBe(
      false,
    );
  });
});

describe("selectors", () => {
  it("REQ-0001-03: names blank players by slot number", () => {
    const game = defaultGame();
    const [first, second] = game.players;
    if (!first || !second) throw new Error("fixture");
    const named = { ...second, name: "  Ben " };
    const withName = { ...game, players: [first, named, ...game.players.slice(2)] };
    expect(playerName(withName, first)).toBe("Player 1");
    expect(playerName(withName, named)).toBe("Ben");
  });

  it("REQ-0001-03: only the first `count` players are active", () => {
    expect(activePlayers(gameWith({ count: 5 }))).toHaveLength(5);
  });

  it("REQ-0001-09, -11: computes stack, rate, buy-ins and pot", () => {
    const game = gameWith({ buyIn: 40 });
    expect(stackValue(game)).toBe(20);
    expect(cashOutRate(game)).toBe(2);
    expect(totalBuyins(game)).toBe(4);
    expect(pot(game)).toBe(160);
  });

  it("REQ-0001-11: uses a rate of 1 when the stack is worth nothing", () => {
    const game = gameWith({ chips: [{ id: "white", color: "white", count: 0, value: 1 }] });
    expect(cashOutRate(game)).toBe(1);
  });

  it("REQ-0001-11, -12: values a player's chips and counts issued vs counted", () => {
    const game = defaultGame();
    const players = game.players.map((p, i) =>
      i === 0 ? { ...p, counts: { white: 40, red: 2 } } : p,
    );
    const counted = { ...game, players };
    const [first] = players;
    const [white] = game.chips;
    if (!first || !white) throw new Error("fixture");
    expect(cashOutValue(counted, first)).toBe(11);
    expect(issuedChips(counted, white)).toBe(80);
    expect(countedChips(counted, white)).toBe(40);
    expect(countedValue(counted)).toBe(11);
  });

  it("REQ-0001-07: allows starting only with a buy-in and a stack worth something", () => {
    expect(canStartGame(defaultGame())).toBe(true);
    expect(canStartGame(gameWith({ buyIn: 0 }))).toBe(false);
    expect(
      canStartGame(gameWith({ chips: [{ id: "red", color: "red", count: 0, value: 1 }] })),
    ).toBe(false);
  });
});
