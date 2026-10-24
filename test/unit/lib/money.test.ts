import { describe, expect, it } from "vitest";

import { MAX_AMOUNT, MAX_COUNT, moneyFormatter, parseCount, parseDecimal } from "@/lib/money";

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
