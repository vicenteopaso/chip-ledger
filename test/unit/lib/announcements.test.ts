import { describe, expect, it } from "vitest";

import { changeAnnouncement, remoteChanges } from "@/lib/announcements";
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

describe("remoteChanges (REQ-0003-29)", () => {
  const rebuy = (game: ReturnType<typeof defaultGame>, ...ids: string[]) => ({
    ...game,
    players: game.players.map((p) => (ids.includes(p.id) ? { ...p, buyins: p.buyins + 1 } : p)),
  });

  it("says nothing when nothing a listener cares about changed", () => {
    const game = defaultGame();
    expect(remoteChanges(game, { ...game, screen: "settle" }, usd)).toBeNull();
    const renamed = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? { ...p, name: "Ana" } : p)),
    };
    expect(remoteChanges(game, renamed, usd)).toBeNull();
  });

  it("names the player who rebought, with the new pot", () => {
    const game = defaultGame();
    const named = {
      ...game,
      players: game.players.map((p, i) => (i === 0 ? { ...p, name: "Ana" } : p)),
    };
    expect(remoteChanges(named, rebuy(named, "p1"), usd)).toBe("Ana: 2 buy-ins, pot $100.00");
  });

  it("joins several changes in one update into one sentence, with one pot", () => {
    const game = defaultGame();
    const text = remoteChanges(game, rebuy(game, "p1", "p2"), usd);
    expect(text).toBe("Player 1: 2 buy-ins, Player 2: 2 buy-ins, pot $120.00");
  });

  it("says the new player count first", () => {
    const game = defaultGame();
    expect(remoteChanges(game, { ...rebuy(game, "p1"), count: 5 }, usd)).toBe(
      "5 players, Player 1: 2 buy-ins, pot $120.00",
    );
  });

  it("uses the singular for one buy-in and ignores players who are not in the game", () => {
    const game = defaultGame();
    const two = rebuy(game, "p1");
    expect(
      remoteChanges(
        two,
        {
          ...rebuy(game, "p1"),
          players: two.players.map((p, i) => (i === 0 ? { ...p, buyins: 1 } : p)),
        },
        usd,
      ),
    ).toBe("Player 1: 1 buy-in, pot $80.00");
    expect(remoteChanges(game, rebuy(game, "p9"), usd)).toBeNull();
  });
});
