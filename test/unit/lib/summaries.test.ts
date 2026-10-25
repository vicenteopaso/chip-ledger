import { describe, expect, it } from "vitest";

import { settle } from "@/lib/settlement";
import {
  countCheckRows,
  countCheckSummary,
  hasPotMismatch,
  resultsText,
  setupSummary,
} from "@/lib/summaries";
import { defaultGame, gameWith, usd } from "@/test/unit/fixtures";

describe("setupSummary", () => {
  it("AC-0001-02: confirms a stack that matches the buy-in", () => {
    expect(setupSummary(defaultGame(), usd)).toEqual({
      kind: "ok",
      text: "Each starting stack is worth $20.00, matching the buy-in.",
    });
  });

  it("AC-0001-02: asks for a buy-in first", () => {
    expect(setupSummary(gameWith({ buyIn: 0 }), usd).text).toBe("Enter a buy-in amount.");
  });

  it("REQ-0001-06: asks for chips when the stack is worth nothing", () => {
    const game = gameWith({ chips: [{ id: "red", color: "red", count: 0, value: 1 }] });
    expect(setupSummary(game, usd).text).toBe(
      "Add at least one chip color with a count and a value.",
    );
  });

  it("AC-0001-03: states the cash-out rate when the stack does not match", () => {
    const game = gameWith({ chips: [{ id: "blue", color: "blue", count: 10, value: 1 }] });
    expect(setupSummary(game, usd)).toEqual({
      kind: "warn",
      text: "The stack adds up to $10.00 but the buy-in is $20.00. Chips will cash out at 200% of the values above so the money always balances. Adjust the counts or values if that isn't what you want.",
    });
  });
});

describe("count check", () => {
  it("AC-0001-05: lists counted of issued per color and flags mismatches", () => {
    const game = defaultGame();
    const players = game.players.map((p, i) => (i === 0 ? { ...p, counts: { white: 40 } } : p));
    const counted = { ...game, players };
    expect(countCheckRows(counted)[0]).toMatchObject({
      label: "White",
      counted: 40,
      issued: 80,
      mismatch: true,
    });
    expect(countCheckSummary(counted, usd)).toEqual({
      kind: "warn",
      text: "Counted chips are worth $10.00, which is $70.00 less than the $80.00 pot. Recount the colors marked in red, or settle anyway and the difference is spread across everyone.",
    });
  });

  it("REQ-0001-12: says more when the count exceeds the pot, and confirms a match", () => {
    const game = defaultGame();
    const over = { ...game, players: game.players.map((p) => ({ ...p, counts: { blue: 30 } })) };
    expect(countCheckSummary(over, usd).text).toContain("$40.00 more than the $80.00 pot");
    const exact = { ...game, players: game.players.map((p) => ({ ...p, counts: { blue: 20 } })) };
    expect(countCheckSummary(exact, usd)).toEqual({
      kind: "ok",
      text: "Counted chips match the pot exactly.",
    });
  });
});

describe("resultsText", () => {
  it("REQ-0001-22: summarizes date, pot, nets and payments", () => {
    const game = defaultGame();
    const named = {
      ...game,
      players: game.players.map((p, i) => ({
        ...p,
        name: ["Ana", "Ben", "Cy", "Dee"][i] ?? "",
        counts: { blue: [30, 20, 20, 10][i] ?? 0 },
      })),
    };
    const settlement = settle(named);
    expect(hasPotMismatch(settlement)).toBe(false);
    expect(resultsText(settlement, usd, "10/24/2026")).toBe(
      [
        "Poker night 10/24/2026",
        "Pot: $80.00",
        "",
        "Ana: +$10.00",
        "Ben: $0.00",
        "Cy: $0.00",
        "Dee: -$10.00",
        "",
        "Payments:",
        "Dee pays Ana $10.00",
      ].join("\n"),
    );
  });

  it("REQ-0001-22: says nobody pays when everyone broke even", () => {
    expect(resultsText(settle(defaultGame()), usd, "d")).toContain("None, everyone broke even");
  });

  it("REQ-0001-20: detects a pot mismatch", () => {
    expect(hasPotMismatch(settle(defaultGame()))).toBe(true);
  });
});
