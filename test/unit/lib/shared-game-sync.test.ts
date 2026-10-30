import { describe, expect, it } from "vitest";

import {
  connectionStatus,
  FAST_WINDOW_MS,
  POLL_FAST_MS,
  POLL_QUIET_MS,
  pollDelayMs,
  retryDelayMs,
  statusAnnouncement,
  statusText,
} from "@/lib/shared-game-sync";

describe("pollDelayMs (plan §5, command budget)", () => {
  it("asks every 2 s for a minute after a change, then every 5 s", () => {
    expect(pollDelayMs(1000, 1000)).toBe(POLL_FAST_MS);
    expect(pollDelayMs(1000, 1000 + FAST_WINDOW_MS - 1)).toBe(POLL_FAST_MS);
    expect(pollDelayMs(1000, 1000 + FAST_WINDOW_MS)).toBe(POLL_QUIET_MS);
  });
});

describe("retryDelayMs", () => {
  it("backs off 2 s, 4 s, 8 s, 16 s, then 30 s", () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(retryDelayMs)).toEqual([
      2000, 4000, 8000, 16000, 30000, 30000, 30000,
    ]);
  });

  it("never waits less than 2 s", () => {
    expect(retryDelayMs(0)).toBe(2000);
  });
});

describe("connectionStatus (REQ-0003-13)", () => {
  it("is live, then reconnecting for the first two misses, then offline", () => {
    expect([0, 1, 2, 3, 9].map(connectionStatus)).toEqual([
      "live",
      "reconnecting",
      "reconnecting",
      "offline",
      "offline",
    ]);
  });
});

describe("what is said about the connection", () => {
  it("announces only a change, in words", () => {
    expect(statusAnnouncement("live", "live")).toBeNull();
    expect(statusAnnouncement("live", "reconnecting")).toBe("Reconnecting.");
    expect(statusAnnouncement("reconnecting", "offline")).toMatch(/offline/i);
    expect(statusAnnouncement("offline", "live")).toBe("Live again.");
  });

  it("shows the status and how many are here", () => {
    expect(statusText("live", null)).toBe("Live");
    expect(statusText("live", 3)).toBe("Live · 3 here");
    expect(statusText("reconnecting", 3)).toBe("Reconnecting…");
    expect(statusText("offline", null)).toMatch(/^Offline/);
  });
});
