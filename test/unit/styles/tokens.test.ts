// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Contrast of token pairs that carry meaning (docs/DESIGN_SYSTEM.md), computed from
 * styles/tokens.css itself so a changed value cannot drift from the documented ratio.
 */
const css = readFileSync(new URL("../../../styles/tokens.css", import.meta.url), "utf8");

type Rgb = [number, number, number];

/** Token values in a block: the light theme (`@theme`) or the forced dark theme. */
function tokens(block: "light" | "dark"): Map<string, string> {
  const start = block === "light" ? css.indexOf("@theme") : css.indexOf(':root[data-theme="dark"]');
  const body = css.slice(start, css.indexOf("}", start));
  return new Map(
    [...body.matchAll(/(--color-[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name ?? "",
      (value ?? "").trim(),
    ]),
  );
}

function hex(value: string): Rgb {
  const digits = /^#([0-9a-f]{6})$/i.exec(value)?.[1];
  if (!digits) throw new Error(`Not a hex color: ${value}`);
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as Rgb;
}

/** A token's color in a theme, resolving `color-mix(in srgb, var(--a) N%, var(--b))`. */
function color(name: string, theme: "light" | "dark"): Rgb {
  const value = tokens(theme).get(name) ?? tokens("light").get(name);
  if (!value) throw new Error(`Unknown token ${name}`);
  const mix = /^color-mix\(in srgb, var\((--[\w-]+)\) (\d+)%, var\((--[\w-]+)\)\)$/.exec(value);
  if (!mix) return hex(value);
  const [, a = "", percent = "0", b = ""] = mix;
  const share = Number(percent) / 100;
  const first = color(a, theme);
  const second = color(b, theme);
  return first.map((channel, i) =>
    Math.round(channel * share + (second[i] ?? 0) * (1 - share)),
  ) as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

describe("design token contrast", () => {
  for (const theme of ["light", "dark"] as const) {
    it(`AC-0002-04: the done-step border is at least 3:1 against the page (${theme})`, () => {
      expect(
        contrast(color("--color-step-done", theme), color("--color-bg", theme)),
      ).toBeGreaterThanOrEqual(3);
    });

    it(`REQ-0002-06: field borders are at least 3:1 against page and surface (${theme})`, () => {
      const border = color("--color-border-control", theme);
      expect(contrast(border, color("--color-bg", theme))).toBeGreaterThanOrEqual(3);
      expect(contrast(border, color("--color-surface", theme))).toBeGreaterThanOrEqual(3);
    });
  }

  it("reads mixed tokens, so the check above is not vacuous", () => {
    expect(tokens("light").get("--color-step-done")).toMatch(/^color-mix/);
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
  });
});
