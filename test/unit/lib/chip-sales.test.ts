import { describe, expect, it } from "vitest";

import { changeAnnouncement, remoteChanges } from "@/lib/announcements";
import { GameStateSchema, hasChipSales, moneyIn, pot } from "@/lib/game";
import { canSetPlayerCount, gameReducer } from "@/lib/game-reducer";
import { moneyFormatter } from "@/lib/money";
import { settle } from "@/lib/settlement";
import { applyAction, SharedActionSchema, SharedGameBodySchema } from "@/lib/shared-game";
import { coalesceKey } from "@/lib/shared-game-queue";
import { defaultGame, gameWith } from "@/test/unit/fixtures";

const usd = moneyFormatter("USD", "en-US");
const sell = (sellerId: string, buyerId: string, amount: number) =>
  ({ type: "sellChips", sellerId, buyerId, amount }) as const;
const player = (game: ReturnType<typeof defaultGame>, id: string) => {
  const found = game.players.find((p) => p.id === id);
  if (!found) throw new Error(`no player ${id}`);
  return found;
};
const movedTotal = (game: ReturnType<typeof defaultGame>) =>
  game.players.reduce((sum, p) => sum + p.moved, 0);

describe("SPEC-0004: money in", () => {
  it("REQ-0004-02: money in is buy-ins times the buy-in plus money moved by sales", () => {
    const game = gameReducer(defaultGame(), sell("p1", "p2", 5));
    expect(moneyIn(game, player(game, "p1"))).toBe(15);
    expect(moneyIn(game, player(game, "p2"))).toBe(25);
  });

  it("REQ-0004-06: the pot is the sum of money in, unchanged by a sale, changed by a buy-in", () => {
    const before = defaultGame();
    const sold = gameReducer(before, sell("p1", "p2", 5));
    expect(pot(sold)).toBe(pot(before));
    const rebuy = gameReducer(sold, { type: "adjustBuyins", playerId: "p2", delta: 1 });
    expect(pot(rebuy)).toBe(pot(before) + 20);
    expect(moneyIn(rebuy, player(rebuy, "p2"))).toBe(45);
  });

  it("REQ-0004-10: a game saved before sales existed opens with nothing moved", () => {
    const old = JSON.parse(JSON.stringify(defaultGame())) as { players: Record<string, unknown>[] };
    for (const p of old.players) delete p.moved;
    const parsed = GameStateSchema.parse(old);
    expect(parsed.players.every((p) => p.moved === 0)).toBe(true);
    expect(pot(parsed)).toBe(80);
    expect(hasChipSales(parsed)).toBe(false);
  });
});

describe("SPEC-0004: sellChips", () => {
  it("REQ-0004-03: moves the amount from the seller to the buyer", () => {
    const game = gameReducer(defaultGame(), sell("p1", "p2", 5));
    expect(player(game, "p1").moved).toBe(-5);
    expect(player(game, "p2").moved).toBe(5);
    expect(movedTotal(game)).toBe(0);
  });

  it("REQ-0004-04: a seller's money in may go below zero (AC-0004-03)", () => {
    const game = gameReducer(defaultGame(), sell("p1", "p2", 50));
    expect(moneyIn(game, player(game, "p1"))).toBe(-30);
  });

  it("AC-0004-05: the reverse sale clears both lines", () => {
    let game = gameReducer(defaultGame(), sell("p1", "p2", 5));
    game = gameReducer(game, sell("p2", "p1", 5));
    expect(player(game, "p1").moved).toBe(0);
    expect(player(game, "p2").moved).toBe(0);
    expect(hasChipSales(game)).toBe(false);
  });

  it("amounts are kept to the currency's smallest unit, so cents do not drift", () => {
    let game = defaultGame();
    for (let i = 0; i < 10; i += 1) game = gameReducer(game, sell("p1", "p2", 0.1));
    expect(player(game, "p2").moved).toBe(1);
    expect(player(game, "p1").moved).toBe(-1);
    expect(movedTotal(game)).toBe(0);
  });

  it("changes nothing for the same player, no amount, a sub-cent amount, or players not in the game", () => {
    const game = defaultGame();
    expect(gameReducer(game, sell("p1", "p1", 5))).toBe(game);
    expect(gameReducer(game, sell("p1", "p2", 0))).toBe(game);
    expect(gameReducer(game, sell("p1", "p2", -5))).toBe(game);
    expect(gameReducer(game, sell("p1", "p2", 0.001))).toBe(game);
    expect(gameReducer(game, sell("p1", "nobody", 5))).toBe(game);
    expect(gameReducer(game, sell("p1", "p5", 5))).toBe(game); // p5 is not in a 4-player game
  });
});

describe("SPEC-0004: player count and new games", () => {
  it("REQ-0004-13: lowering the count is refused while a dropped player holds a sale amount (AC-0004-10)", () => {
    const game = gameReducer(defaultGame(), sell("p1", "p4", 5));
    expect(canSetPlayerCount(game, 3)).toBe(false);
    expect(gameReducer(game, { type: "setPlayerCount", count: 3 })).toBe(game);
    expect(gameReducer(game, { type: "setPlayerCount", count: 5 }).count).toBe(5);
  });

  it("REQ-0004-13: lowering the count works when the dropped players hold none", () => {
    const game = gameReducer(defaultGame(), sell("p1", "p2", 5));
    expect(gameReducer(game, { type: "setPlayerCount", count: 3 }).count).toBe(3);
  });

  it("REQ-0004-13: a new game with the same players clears the sale amounts", () => {
    const game = gameReducer(gameReducer(defaultGame(), sell("p1", "p2", 5)), {
      type: "newGameSamePlayers",
    });
    expect(movedTotal(game)).toBe(0);
    expect(game.players.every((p) => p.moved === 0)).toBe(true);
  });
});

describe("SPEC-0004: Settle", () => {
  it("REQ-0004-05, AC-0004-04: settles against money in and says sales were included", () => {
    // Each player counts 20 blue ($1 each): everyone cashes out 20.
    const counts = { blue: 20 };
    const game = gameReducer(
      gameWith({ players: defaultGame().players.map((p) => ({ ...p, counts })) }),
      sell("p1", "p2", 5),
    );
    const result = settle(game);
    expect(result.includesChipSales).toBe(true);
    expect(result.rows.map((r) => r.putIn).slice(0, 2)).toEqual([15, 25]);
    // Ana put in 15 and takes 20 out; Ben put in 25 and takes 20 out.
    expect(result.rows.map((r) => r.netMinor).slice(0, 2)).toEqual([500, -500]);
    expect(result.payments).toEqual([{ from: "Player 2", to: "Player 1", minor: 500 }]);
    expect(result.pot).toBe(80);
  });

  it("does not mention sales when there are none", () => {
    expect(settle(defaultGame()).includesChipSales).toBe(false);
  });
});

describe("SPEC-0004: shared games", () => {
  const state = () => ({
    started: true,
    game: SharedGameBodySchema.parse(defaultGame()),
  });

  it("REQ-0004-12: the sale schema accepts a valid sale", () => {
    expect(SharedActionSchema.safeParse(sell("p1", "p2", 5)).success).toBe(true);
  });

  it.each([
    ["the same player", sell("p1", "p1", 5)],
    ["an amount of zero", sell("p1", "p2", 0)],
    ["a negative amount", sell("p1", "p2", -1)],
    ["an amount that is not a number", { ...sell("p1", "p2", 5), amount: "5" }],
    ["an amount that is not finite", { ...sell("p1", "p2", 5), amount: Number.POSITIVE_INFINITY }],
    ["extra fields", { ...sell("p1", "p2", 5), extra: 1 }],
    ["an empty player id", sell("", "p2", 5)],
  ])("REQ-0004-12: the sale schema rejects %s", (_name, action) => {
    expect(SharedActionSchema.safeParse(action).success).toBe(false);
  });

  it("applies a sale to a shared game and keeps the pot", () => {
    const next = applyAction(state(), sell("p1", "p2", 5));
    expect(next?.game.players[0]?.moved).toBe(-5);
    expect(next?.game.players[1]?.moved).toBe(5);
  });

  it("AC-0004-11: a sale that does not apply is invalid (unknown or hidden player)", () => {
    expect(applyAction(state(), sell("p1", "nobody", 5))).toBeNull();
    expect(applyAction(state(), sell("p1", "p6", 5))).toBeNull();
    expect(applyAction(state(), sell("p1", "p2", 0.001))).toBeNull();
  });

  it("an old stored body without `moved` parses with zero", () => {
    const old = JSON.parse(JSON.stringify(state().game)) as { players: Record<string, unknown>[] };
    for (const p of old.players) delete p.moved;
    expect(SharedGameBodySchema.parse(old).players.every((p) => p.moved === 0)).toBe(true);
  });

  it("every sale counts: sales are never merged in the queue", () => {
    expect(coalesceKey(sell("p1", "p2", 5))).toBeNull();
  });

  it("REQ-0004-08: announces a remote sale once, with each player's new amount", () => {
    const before = defaultGame();
    const after = gameReducer(before, sell("p1", "p2", 5));
    expect(remoteChanges(before, after, usd)).toBe(
      "Chip sale: Player 1 now $15.00 in, Player 2 now $25.00 in",
    );
    expect(remoteChanges(after, after, usd)).toBeNull();
  });

  it("announces a sale made on this device, and nothing when no amount changed", () => {
    const before = defaultGame();
    const after = gameReducer(before, sell("p1", "p2", 5));
    expect(changeAnnouncement(before, after, usd)).toBe(
      "Chip sale: Player 1 now $15.00 in, Player 2 now $25.00 in",
    );
    expect(changeAnnouncement(after, after, usd)).toBeNull();
  });
});
