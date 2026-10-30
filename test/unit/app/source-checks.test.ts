// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("source checks", () => {
  it("AC-0002-15: never assumes a touch screen", () => {
    const files = [...sources("app"), "lib/summaries.ts", "lib/photo-count.ts"];
    const offending = files.filter((file) =>
      /\bTap\b/.test(readFileSync(join(root, file), "utf8")),
    );
    expect(offending).toEqual([]);
  });

  it("AC-0002-20: no component-specific focus rings or removed outlines", () => {
    const offending = sources("app").filter((file) =>
      /\b(focus:)?outline-none\b|focus-within:ring/.test(readFileSync(join(root, file), "utf8")),
    );
    expect(offending).toEqual([]);
  });

  it("AC-0002-23: no one-off sizes or arbitrary values", () => {
    const banned = /\b(w-23|h-42\.5|size-13|py-1\.75|w-9\.5)\b|-\[/;
    const offending = sources("app").filter((file) =>
      banned.test(readFileSync(join(root, file), "utf8")),
    );
    expect(offending).toEqual([]);
  });

  it("AC-0002-29: ships a favicon and a home-screen icon drawn from the brand mark", () => {
    const icon = readFileSync(join(root, "app/icon.svg"), "utf8");
    expect(icon).toContain('viewBox="0 0 32 32"');
    // The light theme's accent and page colors (styles/tokens.css).
    expect(icon).toContain("#14573f");
    expect(icon).toContain("#e9efea");
    expect(existsSync(join(root, "app/apple-icon.png"))).toBe(true);
  });
});
