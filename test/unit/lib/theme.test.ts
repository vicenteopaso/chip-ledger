import { afterEach, describe, expect, it, vi } from "vitest";

import {
  nextTheme,
  THEME_INIT_SCRIPT,
  THEME_LABELS,
  THEME_STORAGE_KEY,
  ThemeSchema,
} from "@/lib/theme";

describe("theme", () => {
  it("REQ-0001-32: cycles System, Light, Dark, then back to System", () => {
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });

  it("REQ-0001-32: has a label for each choice and rejects anything else", () => {
    expect(THEME_LABELS).toEqual({ system: "System", light: "Light", dark: "Dark" });
    expect(ThemeSchema.safeParse("sepia").success).toBe(false);
  });

  /** Runs the pre-paint script in the jsdom page, as the browser runs it in the head. */
  function runInitScript(): string | undefined {
    delete document.documentElement.dataset.theme;
    const script = document.createElement("script");
    script.textContent = THEME_INIT_SCRIPT;
    document.head.append(script);
    script.remove();
    return document.documentElement.dataset.theme;
  }

  afterEach(() => {
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it("REQ-0001-32: the pre-paint script forces only a saved Light or Dark", () => {
    for (const [saved, expected] of [
      ["dark", "dark"],
      ["light", "light"],
      ["system", undefined],
      ["nonsense", undefined],
    ] as const) {
      localStorage.setItem(THEME_STORAGE_KEY, saved);
      expect(runInitScript(), saved).toBe(expected);
    }
    localStorage.removeItem(THEME_STORAGE_KEY);
    expect(runInitScript()).toBeUndefined();
  });

  it("REQ-0001-32: the pre-paint script ignores unavailable storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runInitScript()).toBeUndefined();
  });
});
