import { z } from "zod";

export const CURRENCIES = ["USD", "EUR", "GBP", "CLP"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CurrencySchema = z.enum(CURRENCIES);

/** Upper bounds keep typed input inside what the saved-state schema accepts. */
export const MAX_COUNT = 999_999;
export const MAX_AMOUNT = 1_000_000_000;

export type MoneyFormatter = (amount: number) => string;

/** Formats with the given locale (the browser's when undefined) and currency (REQ-0001-04). */
export function moneyFormatter(currency: Currency, locale?: string): MoneyFormatter {
  const format = new Intl.NumberFormat(locale, { style: "currency", currency });
  return (amount) => format.format(amount);
}

/** Parses a decimal typed by a person; a comma counts as the decimal separator. Invalid input is 0. */
export function parseDecimal(text: string): number {
  const value = Number.parseFloat(text.replace(",", "."));
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_AMOUNT, Math.max(-MAX_AMOUNT, value));
}

/** Parses a whole chip count, ignoring anything that is not a digit (REQ-0001-10). */
export function parseCount(text: string): number {
  const value = Number.parseInt(text.replace(/\D/g, ""), 10);
  return Number.isNaN(value) ? 0 : Math.min(MAX_COUNT, value);
}
