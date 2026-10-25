import type { ChipColor } from "@/lib/chips";
import { type Currency, currencyDigits, minorPerUnit, toMinor } from "@/lib/money";

/** Chips to give each player so the starting stack equals the buy-in (REQ-0001-29). */
export type PlannedChip = { color: ChipColor; count: number; value: number };

/** How many of the lowest chip a stack is aimed at, and for the single All colors chip. */
const COLORED_TARGET = 80;
const UNIFORM_TARGET = 40;

/** Value ratio of the three rows (white : red : blue). */
const RATIO = [1, 2, 4] as const;
const COLORS = ["white", "red", "blue"] as const;

/** "Round" amounts, largest first: 5, 2.5, 2, 1 times each power of ten that fits a safe integer. */
function roundUnits(max: number): number[] {
  const units: number[] = [];
  for (let exponent = 12; exponent >= 0; exponent -= 1) {
    for (const multiple of [5, 2.5, 2, 1]) {
      const unit = multiple * 10 ** exponent;
      if (Number.isInteger(unit) && unit <= max) units.push(unit);
    }
  }
  return units;
}

/**
 * The largest round unit of at most `total / target` that divides `total` exactly, or 1.
 * Everything is in the currency's smallest unit, so no fractions arise.
 */
function pickUnit(total: number, target: number): number {
  const max = Math.floor(total / target);
  return roundUnits(max).find((unit) => total % unit === 0) ?? 1;
}

/** Back to a currency amount without float noise (25 → 0.25 for USD). */
function toAmount(minor: number, currency: Currency): number {
  return Number((minor / minorPerUnit(currency)).toFixed(currencyDigits(currency)));
}

/**
 * Three chips (white, red, blue) worth exactly `buyIn`, valued 1:2:4 with about twice as many
 * white as red or blue: 20 USD → 20 × 0.25, 10 × 0.50, 10 × 1. `null` when there is no buy-in.
 */
export function planChips(buyIn: number, currency: Currency): PlannedChip[] | null {
  const total = toMinor(buyIn, currency);
  if (total < 1) return null;
  const unit = pickUnit(total, COLORED_TARGET);
  const units = total / unit;
  const each = Math.min(Math.round(units / 8), Math.floor(units / 6));
  const counts = [units - 6 * each, each, each];
  return COLORS.map((color, i) => ({
    color,
    count: counts[i] ?? 0,
    value: toAmount(unit * (RATIO[i] ?? 1), currency),
  }));
}

/** The single All colors chip worth exactly `buyIn`: 20 USD → 40 × 0.50. `null` without a buy-in. */
export function planUniformChip(
  buyIn: number,
  currency: Currency,
): { count: number; value: number } | null {
  const total = toMinor(buyIn, currency);
  if (total < 1) return null;
  const unit = pickUnit(total, UNIFORM_TARGET);
  return { count: total / unit, value: toAmount(unit, currency) };
}
