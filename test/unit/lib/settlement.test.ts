import { describe, expect, it } from "vitest";

import type { GameState } from "@/lib/game";
import { settle } from "@/lib/settlement";
import { defaultGame } from "@/test/unit/fixtures";

/** Default chips, so one unit of face value is worth $1. `blue` chips are worth $1 each. */
function withBlueCounts(blues: number[], overrides: Partial<GameState> = {}): GameState {
  const game = defaultGame();
  const names = ["Ana", "Ben", "Cy", "Dee", "Eve", "Fay"];
  return {
    ...game,
    ...overrides,
    players: game.players.map((p, i) => {
      const blue = blues[i];
      const counts: Record<string, number> = blue === undefined ? {} : { blue };
      return { ...p, name: names[i] ?? "", counts };
    }),
  };
}

describe("settle", () => {
  it("AC-0001-06: largest debtor pays largest creditor first, no zero payments", () => {
    const result = settle(withBlueCounts([35, 25, 10, 10]));
    expect(result.rows.map((r) => r.netMinor)).toEqual([1500, 500, -1000, -1000]);
    expect(result.payments).toEqual([
      { from: "Cy", to: "Ana", minor: 1000 },
      { from: "Dee", to: "Ana", minor: 500 },
      { from: "Dee", to: "Ben", minor: 500 },
    ]);
    expect(result.unaccountedMinor).toBe(0);
  });

  it("REQ-0001-19: no payments when everyone breaks even", () => {
    expect(settle(withBlueCounts([20, 20, 20, 20])).payments).toEqual([]);
  });

  it("REQ-0001-21: reports money in and cashed out per player", () => {
    const [ana] = settle(withBlueCounts([35, 25, 10, 10])).rows;
    expect(ana).toMatchObject({ name: "Ana", putIn: 20, cashedOut: 35, netMinor: 1500 });
  });

  it("AC-0001-07: scaling makes nets sum to exactly zero with an uneven count", () => {
    const result = settle(withBlueCounts([33, 33, 1, 0]));
    expect(result.difference).toBe(-13);
    expect(result.rows.reduce((sum, r) => sum + r.netMinor, 0)).toBe(0);
    const paid = result.payments.reduce((sum, p) => sum + p.minor, 0);
    const owed = result.rows.filter((r) => r.netMinor < 0).reduce((sum, r) => sum - r.netMinor, 0);
    expect(paid).toBe(owed);
  });

  it("REQ-0001-18: the largest absolute net absorbs the rounding residue", () => {
    // Counted 3 chips for an $80 pot: three nets round to +6.67, one cent too many in total.
    const result = settle(withBlueCounts([1, 1, 1, 0]));
    expect(result.rows.map((r) => r.netMinor)).toEqual([667, 667, 667, -2001]);
  });

  it("REQ-0001-20: without scaling, reports the unaccounted amount", () => {
    const result = settle(withBlueCounts([30, 20, 10, 0], { scale: false }));
    expect(result.rows.map((r) => r.netMinor)).toEqual([1000, 0, -1000, -2000]);
    expect(result.unaccountedMinor).toBe(2000);
  });

  it("AC-0002-33: by chips, bigger stacks take a bigger share of a shortfall", () => {
    // Counted $70 for an $80 pot: every cash-out is scaled by 80 / 70.
    const result = settle(withBlueCounts([35, 25, 10, 0]));
    expect(result.spreadBy).toBe("chips");
    expect(result.rows.map((r) => r.cashedOut)).toEqual([40, 25 * (80 / 70), 10 * (80 / 70), 0]);
    expect(result.rows.reduce((sum, r) => sum + r.netMinor, 0)).toBe(0);
  });

  it("AC-0002-33: equally, every player gets the same share of a shortfall", () => {
    // $10 short across 4 players: $2.50 more for each cash-out.
    const result = settle(withBlueCounts([35, 25, 10, 0], { spreadBy: "equal" }));
    expect(result.spreadBy).toBe("equal");
    expect(result.rows.map((r) => r.cashedOut)).toEqual([37.5, 27.5, 12.5, 2.5]);
    expect(result.rows.map((r) => r.netMinor)).toEqual([1750, 750, -750, -1750]);
    expect(result.unaccountedMinor).toBe(0);
  });

  it("AC-0002-33: equally, every player gives up the same share of an excess", () => {
    // $20 over across 4 players: $5 less for each cash-out.
    const result = settle(withBlueCounts([40, 30, 20, 10], { spreadBy: "equal" }));
    expect(result.rows.map((r) => r.netMinor)).toEqual([1500, 500, -500, -1500]);
    expect(result.rows.reduce((sum, r) => sum + r.netMinor, 0)).toBe(0);
  });

  it("REQ-0002-33: equally means equally, even below zero", () => {
    // $120 counted for an $80 pot: $10 less for each cash-out, so Dee's goes to −$10.
    const result = settle(withBlueCounts([60, 40, 20, 0], { spreadBy: "equal" }));
    const dee = result.rows[3];
    expect(dee).toMatchObject({ name: "Dee", cashedOut: -10, netMinor: -3000 });
    expect(result.rows.reduce((sum, r) => sum + r.netMinor, 0)).toBe(0);
  });

  it("AC-0002-33: equal shares that don't divide evenly still sum to zero", () => {
    // $58 short across 3 players: $19.333… each, so the nets round to one cent too many.
    const result = settle(withBlueCounts([1, 1, 0], { count: 3, spreadBy: "equal" }));
    expect(result.rows.map((r) => r.cashedOut)).toEqual([1 + 58 / 3, 1 + 58 / 3, 58 / 3]);
    expect(result.rows.reduce((sum, r) => sum + r.netMinor, 0)).toBe(0);
  });

  it("REQ-0002-33: nothing is shared when spreading is off", () => {
    expect(settle(withBlueCounts([35, 25, 10, 0], { scale: false })).spreadBy).toBeNull();
  });

  it("REQ-0001-18: does not scale when nothing was counted", () => {
    const result = settle(withBlueCounts([]));
    expect(result.counted).toBe(0);
    expect(result.rows.every((r) => r.cashedOut === 0)).toBe(true);
  });
});

describe("settle in whole units", () => {
  it("REQ-0001-30: CLP payments are whole pesos and the nets sum to zero", () => {
    const base = defaultGame();
    const game = {
      ...base,
      currency: "CLP" as const,
      buyIn: 10_000,
      chips: [{ id: "blue", color: "blue" as const, count: 100, value: 100 }],
      players: base.players.map((p, i) => ({
        ...p,
        name: ["Ana", "Ben", "Cy", "Dee"][i] ?? "",
        counts: { blue: [150, 120, 77, 40][i] ?? 0 },
      })),
    };
    const result = settle(game);
    expect(result.rows.reduce((sum, r) => sum + r.netMinor, 0)).toBe(0);
    expect(result.rows.map((r) => r.netMinor)).toEqual([
      ...result.rows.map((r) => Math.round(r.netMinor)),
    ]);
    expect(result.currency).toBe("CLP");
    expect(result.payments.reduce((sum, p) => sum + p.minor, 0)).toBe(
      result.rows.filter((r) => r.netMinor < 0).reduce((sum, r) => sum - r.netMinor, 0),
    );
    expect(result.payments.every((p) => Number.isInteger(p.minor) && p.minor > 0)).toBe(true);
  });
});
