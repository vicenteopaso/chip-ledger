import { afterEach, describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "@/lib/infra/clipboard";

describe("copyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("REQ-0001-22: resolves true after writing", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    expect(await copyToClipboard("hi", { writeText } as unknown as Clipboard)).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hi");
  });

  it("AC-0001-12: resolves false when the write is rejected or there is no clipboard", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const writeText = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
    expect(await copyToClipboard("hi", { writeText } as unknown as Clipboard)).toBe(false);
    expect(await copyToClipboard("hi", undefined)).toBe(false);
  });
});
