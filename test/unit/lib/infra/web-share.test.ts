import { describe, expect, it, vi } from "vitest";

import { canShare, shareText } from "@/lib/infra/web-share";

const data = { title: "Poker night results", text: "Ana +5.00" };

describe("web share (share the results)", () => {
  it("is available only where the browser has a share menu", () => {
    expect(canShare(undefined)).toBe(false);
    expect(canShare({ share: vi.fn() })).toBe(true);
  });

  it("opens the menu with the title and text", async () => {
    const share = vi.fn(() => Promise.resolve());
    expect(await shareText(data, { share })).toBe("shared");
    expect(share).toHaveBeenCalledWith(data);
  });

  it("closing the menu without choosing is not a failure", async () => {
    const share = vi.fn(() => Promise.reject(new DOMException("closed", "AbortError")));
    expect(await shareText(data, { share })).toBe("cancelled");
  });

  it("reports a refusal, so the caller can copy instead", async () => {
    const share = vi.fn(() => Promise.reject(new DOMException("no", "NotAllowedError")));
    expect(await shareText(data, { share })).toBe("failed");
    expect(await shareText(data, undefined)).toBe("failed");
  });
});
