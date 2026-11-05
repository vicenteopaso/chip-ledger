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
    it(`REQ-0002-06: field borders are at least 3:1 against page and surface (${theme})`, () => {
      const border = color("--color-border-control", theme);
      expect(contrast(border, color("--color-bg", theme))).toBeGreaterThanOrEqual(3);
      expect(contrast(border, color("--color-surface", theme))).toBeGreaterThanOrEqual(3);
    });
  }

  for (const theme of ["light", "dark"] as const) {
    it(`AC-0002-18: disabled text is at least 3:1 on its background (${theme})`, () => {
      expect(
        contrast(color("--color-disabled-ink", theme), color("--color-disabled-bg", theme)),
      ).toBeGreaterThanOrEqual(3);
    });

    it(`REQ-0002-17: hovered buttons keep their text contrast (${theme})`, () => {
      expect(
        contrast(color("--color-accent-ink", theme), color("--color-accent-hover", theme)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(color("--color-text", theme), color("--color-surface-hover", theme)),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it(`REQ-0002-31: button and notice tints keep their text contrast (${theme})`, () => {
      for (const fill of ["--color-accent-soft", "--color-accent-soft-hover"]) {
        expect(contrast(color("--color-text", theme), color(fill, theme))).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      for (const fill of ["--color-danger-soft", "--color-danger-soft-hover"]) {
        expect(contrast(color("--color-danger", theme), color(fill, theme))).toBeGreaterThanOrEqual(
          4.5,
        );
      }
      const success = color("--color-success-bg", theme);
      expect(contrast(color("--color-text", theme), success)).toBeGreaterThanOrEqual(4.5);
      // The check mark and the left rule are graphics: 3:1 (WCAG 1.4.11).
      expect(contrast(color("--color-success", theme), success)).toBeGreaterThanOrEqual(3);
      // The warning's rule and icon are its text color.
      expect(
        contrast(color("--color-warn-ink", theme), color("--color-warn-bg", theme)),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it(`AC-0005-01, REQ-0005-04: step bars are at least 3:1 against the page (${theme})`, () => {
      const bg = color("--color-bg", theme);
      // Done and current steps: brass; later steps: the control border.
      expect(contrast(color("--color-accent", theme), bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(color("--color-border-control", theme), bg)).toBeGreaterThanOrEqual(3);
    });

    it(`AC-0005-01, REQ-0005-01: Card Room text pairs reach 4.5:1 (${theme})`, () => {
      const pairs: [string, string][] = [
        ["--color-text", "--color-bg"],
        ["--color-text", "--color-surface"],
        ["--color-text-muted", "--color-bg"],
        ["--color-text-muted", "--color-surface"],
        ["--color-accent-ink", "--color-accent"],
        ["--color-accent-text", "--color-bg"],
        ["--color-accent-text", "--color-surface"],
        ["--color-accent-text", "--color-accent-soft"],
        ["--color-felt-ink", "--color-felt"],
        ["--color-felt-muted", "--color-felt"],
        ["--color-text", "--color-avatar"],
        ["--color-success", "--color-surface"],
        ["--color-danger", "--color-surface"],
      ];
      for (const [ink, fill] of pairs) {
        expect(
          contrast(color(ink, theme), color(fill, theme)),
          `${ink} on ${fill}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });

    it(`AC-0005-01, REQ-0005-01: focus, gain and loss bars reach 3:1 (${theme})`, () => {
      for (const edge of ["--color-focus", "--color-success", "--color-danger"]) {
        for (const fill of ["--color-bg", "--color-surface"]) {
          expect(
            contrast(color(edge, theme), color(fill, theme)),
            `${edge} on ${fill}`,
          ).toBeGreaterThanOrEqual(3);
        }
      }
      // The focus outline also has to show around a brass button.
      expect(
        contrast(color("--color-focus", theme), color("--color-bg", theme)),
      ).toBeGreaterThanOrEqual(3);
    });
  }

  it("reads mixed tokens, so the check above is not vacuous", () => {
    expect(tokens("light").get("--color-accent-soft")).toMatch(/^color-mix/);
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21);
  });
});
