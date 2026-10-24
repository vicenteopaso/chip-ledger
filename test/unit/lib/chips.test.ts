import { describe, expect, it } from "vitest";

import { availableColors, CHIP_COLORS } from "@/lib/chips";

describe("availableColors", () => {
  it("REQ-0001-05: hides colors used by other rows but keeps the row's own color", () => {
    const options = availableColors(["white", "red"], "red");
    expect(options).toContain("red");
    expect(options).not.toContain("white");
    expect(options).toHaveLength(CHIP_COLORS.length - 1);
  });
});
