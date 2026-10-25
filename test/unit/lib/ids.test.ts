import { describe, expect, it } from "vitest";

import { randomId, sequentialIds } from "@/lib/ids";

describe("ids", () => {
  it("produces a predictable sequence for the default game", () => {
    const next = sequentialIds("d-");
    expect([next(), next(), next()]).toEqual(["d-1", "d-2", "d-3"]);
  });

  it("produces short random ids", () => {
    expect(randomId()).toMatch(/^[a-z0-9]{1,7}$/);
  });
});
