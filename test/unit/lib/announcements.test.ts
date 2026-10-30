import { describe, expect, it } from "vitest";

import { changeAnnouncement } from "@/lib/announcements";
import { defaultGame, usd } from "@/test/unit/fixtures";

describe("changeAnnouncement", () => {
  it("AC-0002-07: states the new player count", () => {
    const game = defaultGame();
    expect(changeAnnouncement(game, { ...game, count: 5 }, usd)).toBe("5 players");
  });

  it("REQ-0002-07: names the player whose buy-ins changed, with the new pot", () => {
    const game = defaultGame();
    const players = game.players.map((p, i) => (i === 1 ? { ...p, name: "Ben", buyins: 2 } : p));
    expect(changeAnnouncement(game, { ...game, players }, usd)).toBe("Ben: 2 buy-ins, pot $100.00");
    const none = game.players.map((p, i) => (i === 0 ? { ...p, buyins: 0 } : p));
    expect(changeAnnouncement(game, { ...game, players: none }, usd)).toBe(
      "Player 1: 0 buy-ins, pot $60.00",
    );
  });

  it("REQ-0002-07: says buy-in in the singular for one", () => {
    const game = defaultGame();
    const zero = { ...game, players: game.players.map((p) => ({ ...p, buyins: 0 })) };
    const one = {
      ...zero,
      players: zero.players.map((p, i) => (i === 2 ? { ...p, buyins: 1 } : p)),
    };
    expect(changeAnnouncement(zero, one, usd)).toBe("Player 3: 1 buy-in, pot $20.00");
  });

  it("REQ-0002-07: stays quiet for edits the focused field already speaks for", () => {
    const game = defaultGame();
    expect(changeAnnouncement(game, { ...game, buyIn: 30 }, usd)).toBeNull();
  });
});
