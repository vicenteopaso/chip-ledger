import { describe, expect, it } from "vitest";

import {
  CURRENCIES,
  currencyDigits,
  fromMinor,
  MAX_AMOUNT,
  MAX_COUNT,
  moneyFormatter,
  parseCount,
  parseDecimal,
  parseMoney,
  toMinor,
  typicalBuyIn,
} from "@/lib/money";

describe("moneyFormatter", () => {
  it("REQ-0001-04: formats with the given locale and currency", () => {
    expect(moneyFormatter("USD", "en-US")(20)).toBe("$20.00");
    expect(moneyFormatter("EUR", "en-US")(1.5)).toBe("€1.50");
    expect(moneyFormatter("GBP", "en-US")(-3)).toBe("-£3.00");
    expect(moneyFormatter("CLP", "es-CL")(5000)).toBe("$5.000");
  });
});

describe("parseDecimal", () => {
  it("REQ-0001-04: accepts a comma as the decimal separator", () => {
    expect(parseDecimal("2,5")).toBe(2.5);
    expect(parseDecimal("0.25")).toBe(0.25);
  });

  it("treats invalid input as 0 and clamps extremes", () => {
    expect(parseDecimal("")).toBe(0);
    expect(parseDecimal("abc")).toBe(0);
    expect(parseDecimal("1e99")).toBe(MAX_AMOUNT);
    expect(parseDecimal("-1e99")).toBe(-MAX_AMOUNT);
  });
});

describe("parseCount", () => {
  it("REQ-0001-10: keeps only digits and returns a whole number", () => {
    expect(parseCount("12")).toBe(12);
    expect(parseCount("1a2")).toBe(12);
    expect(parseCount("-4")).toBe(4);
    expect(parseCount("")).toBe(0);
  });

  it("caps very long numbers", () => {
    expect(parseCount("9".repeat(30))).toBe(MAX_COUNT);
  });
});

describe("parseMoney", () => {
  it("REQ-0001-30: currencies with decimals read decimals; others ignore separators", () => {
    expect(parseMoney("2,5", "USD")).toBe(2.5);
    expect(parseMoney("10.000", "CLP")).toBe(10_000);
    expect(parseMoney("10,000", "CLP")).toBe(10_000);
    expect(parseMoney("", "CLP")).toBe(0);
    expect(parseMoney("9".repeat(30), "JPY")).toBe(MAX_AMOUNT);
  });
});

describe("currencies", () => {
  it("REQ-0001-30: offers the common currencies with their digits and typical buy-in", () => {
    expect(CURRENCIES).toHaveLength(38);
    expect(CURRENCIES.slice(0, 3)).toEqual(["USD", "EUR", "GBP"]);
    expect(currencyDigits("CLP")).toBe(0);
    expect(currencyDigits("USD")).toBe(2);
    expect(typicalBuyIn("CLP")).toBe(10_000);
    expect(toMinor(12.345, "USD")).toBe(1235);
    expect(fromMinor(1250, "USD")).toBe(12.5);
    expect(fromMinor(1250, "CLP")).toBe(1250);
    expect(moneyFormatter("CLP", "es-CL")(fromMinor(2500, "CLP"))).toBe("$2.500");
  });
});
