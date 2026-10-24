import { describe, expect, it } from "vitest";

import { planChips, planUniformChip } from "@/lib/chip-plan";
import type { Currency } from "@/lib/money";
import { currencyDigits, minorPerUnit } from "@/lib/money";

const rows = (buyIn: number, currency: Currency) =>
  (planChips(buyIn, currency) ?? []).map((c) => [c.color, c.count, c.value]);

/** Stack value in the currency's smallest unit, to compare exactly. */
const total = (buyIn: number, currency: Currency) =>
  (planChips(buyIn, currency) ?? []).reduce(
    (sum, c) => sum + c.count * Math.round(c.value * minorPerUnit(currency)),
    0,
  );

describe("planChips", () => {
  it("REQ-0001-29: 20 USD gives the default stack", () => {
    expect(rows(20, "USD")).toEqual([
      ["white", 20, 0.25],
      ["red", 10, 0.5],
      ["blue", 10, 1],
    ]);
  });

  it("AC-0001-15: scales values with the buy-in", () => {
    expect(rows(40, "USD")).toEqual([
      ["white", 20, 0.5],
      ["red", 10, 1],
      ["blue", 10, 2],
    ]);
    expect(rows(25, "USD")).toEqual([
      ["white", 22, 0.25],
      ["red", 13, 0.5],
      ["blue", 13, 1],
    ]);
  });

  it("AC-0001-16: uses hundreds and thousands for CLP", () => {
    expect(rows(10_000, "CLP")).toEqual([
      ["white", 22, 100],
      ["red", 13, 200],
      ["blue", 13, 400],
    ]);
    expect(rows(20_000, "CLP")).toEqual([
      ["white", 20, 250],
      ["red", 10, 500],
      ["blue", 10, 1000],
    ]);
  });

  it("REQ-0001-29: always squares exactly with the buy-in, whatever the amount or currency", () => {
    const cases: [number, Currency][] = [
      [7, "USD"],
      [13.37, "EUR"],
      [0.5, "USD"],
      [1, "USD"],
      [9_999, "CLP"],
      [1_234_567, "CLP"],
      [2_000, "JPY"],
      [300_000, "IDR"],
      [3.01, "GBP"],
    ];
    for (const [buyIn, currency] of cases) {
      expect(total(buyIn, currency), `${String(buyIn)} ${currency}`).toBe(
        Math.round(buyIn * 10 ** currencyDigits(currency)),
      );
      for (const chip of planChips(buyIn, currency) ?? []) {
        expect(chip.count).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(chip.count)).toBe(true);
      }
    }
  });

  it("falls back to the smallest unit when nothing rounder divides the buy-in", () => {
    expect(rows(7.03, "USD")[0]).toEqual(["white", 175, 0.01]);
  });

  it("gives only white chips for a tiny buy-in", () => {
    expect(rows(0.04, "USD")).toEqual([
      ["white", 4, 0.01],
      ["red", 0, 0.02],
      ["blue", 0, 0.04],
    ]);
  });

  it("REQ-0001-29: returns null without a buy-in", () => {
    expect(planChips(0, "USD")).toBeNull();
    expect(planChips(-5, "USD")).toBeNull();
    expect(planUniformChip(0, "USD")).toBeNull();
  });
});

describe("planUniformChip", () => {
  it("REQ-0001-29: 20 USD is 40 chips of 0.50", () => {
    expect(planUniformChip(20, "USD")).toEqual({ count: 40, value: 0.5 });
  });

  it("squares with the buy-in in other currencies", () => {
    expect(planUniformChip(10_000, "CLP")).toEqual({ count: 40, value: 250 });
    const odd = planUniformChip(7.03, "USD");
    expect(odd && Math.round(odd.count * odd.value * 100)).toBe(703);
  });
});
