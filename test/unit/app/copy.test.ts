// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
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

describe("user-facing copy", () => {
  it("AC-0002-15: never assumes a touch screen", () => {
    const files = [...sources("app"), "lib/summaries.ts", "lib/photo-count.ts"];
    const offending = files.filter((file) =>
      /\bTap\b/.test(readFileSync(join(root, file), "utf8")),
    );
    expect(offending).toEqual([]);
  });
});
