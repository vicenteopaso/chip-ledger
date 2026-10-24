import { z } from "zod";

/**
 * Common currencies (REQ-0001-30): ISO decimal digits and a typical buy-in, so a new currency
 * starts at a sensible scale (20 USD, 10,000 CLP, 2,000 JPY).
 */
const CURRENCY_INFO = {
  USD: { digits: 2, buyIn: 20 },
  EUR: { digits: 2, buyIn: 20 },
  GBP: { digits: 2, buyIn: 20 },
  CAD: { digits: 2, buyIn: 25 },
  AUD: { digits: 2, buyIn: 25 },
  NZD: { digits: 2, buyIn: 25 },
  CHF: { digits: 2, buyIn: 20 },
  JPY: { digits: 0, buyIn: 2_000 },
  CNY: { digits: 2, buyIn: 150 },
  HKD: { digits: 2, buyIn: 150 },
  SGD: { digits: 2, buyIn: 25 },
  INR: { digits: 2, buyIn: 1_500 },
  KRW: { digits: 0, buyIn: 20_000 },
  TWD: { digits: 2, buyIn: 600 },
  THB: { digits: 2, buyIn: 700 },
  MYR: { digits: 2, buyIn: 100 },
  IDR: { digits: 2, buyIn: 300_000 },
  PHP: { digits: 2, buyIn: 1_000 },
  VND: { digits: 0, buyIn: 500_000 },
  MXN: { digits: 2, buyIn: 400 },
  BRL: { digits: 2, buyIn: 100 },
  ARS: { digits: 2, buyIn: 20_000 },
  CLP: { digits: 0, buyIn: 10_000 },
  COP: { digits: 2, buyIn: 80_000 },
  PEN: { digits: 2, buyIn: 70 },
  UYU: { digits: 2, buyIn: 800 },
  SEK: { digits: 2, buyIn: 200 },
  NOK: { digits: 2, buyIn: 200 },
  DKK: { digits: 2, buyIn: 150 },
  PLN: { digits: 2, buyIn: 80 },
  CZK: { digits: 2, buyIn: 450 },
  HUF: { digits: 2, buyIn: 7_000 },
  RON: { digits: 2, buyIn: 100 },
  TRY: { digits: 2, buyIn: 600 },
  ILS: { digits: 2, buyIn: 70 },
  AED: { digits: 2, buyIn: 70 },
  SAR: { digits: 2, buyIn: 75 },
  ZAR: { digits: 2, buyIn: 350 },
} as const;

export type Currency = keyof typeof CURRENCY_INFO;

/** In dropdown order: the original four first, then the rest. */
export const CURRENCIES = Object.keys(CURRENCY_INFO) as [Currency, ...Currency[]];

export const CurrencySchema = z.enum(CURRENCIES);

/** Upper bounds keep typed input inside what the saved-state schema accepts. */
export const MAX_COUNT = 999_999;
export const MAX_AMOUNT = 1_000_000_000;

export const typicalBuyIn = (currency: Currency): number => CURRENCY_INFO[currency].buyIn;

/** Decimal digits of the currency's smallest unit (0 for CLP, 2 for USD). */
export const currencyDigits = (currency: Currency): number => CURRENCY_INFO[currency].digits;

/** How many smallest units make one whole unit: 100 for USD, 1 for CLP. */
export const minorPerUnit = (currency: Currency): number => 10 ** currencyDigits(currency);

/** A whole number of smallest units as an amount: 1250 cents → 12.5. */
export const fromMinor = (minor: number, currency: Currency): number =>
  minor / minorPerUnit(currency);

/** An amount as a whole number of smallest units, rounded. */
export const toMinor = (amount: number, currency: Currency): number =>
  Math.round(amount * minorPerUnit(currency));

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

/**
 * Parses an amount in a currency. Currencies without decimals ignore every non-digit, so a
 * thousands separator ("10.000" or "10,000") is read as 10000 (REQ-0001-30).
 */
export function parseMoney(text: string, currency: Currency): number {
  if (currencyDigits(currency) > 0) return parseDecimal(text);
  const value = Number.parseInt(text.replace(/\D/g, ""), 10);
  return Number.isNaN(value) ? 0 : Math.min(MAX_AMOUNT, value);
}

/** Parses a whole chip count, ignoring anything that is not a digit (REQ-0001-10). */
export function parseCount(text: string): number {
  const value = Number.parseInt(text.replace(/\D/g, ""), 10);
  return Number.isNaN(value) ? 0 : Math.min(MAX_COUNT, value);
}
