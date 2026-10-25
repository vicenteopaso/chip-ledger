import { afterEach, describe, expect, it, vi } from "vitest";

import { applyTheme, loadTheme, saveTheme } from "@/lib/infra/theme-storage";
import { THEME_STORAGE_KEY } from "@/lib/theme";

describe("theme storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete document.documentElement.dataset.theme;
  });

  it("REQ-0001-32: saves and restores the choice", () => {
    saveTheme("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(loadTheme()).toBe("dark");
  });

  it("REQ-0001-32: falls back to System for nothing, or for an invalid value", () => {
    expect(loadTheme()).toBe("system");
    localStorage.setItem(THEME_STORAGE_KEY, "nonsense");
    expect(loadTheme()).toBe("system");
  });

  it("REQ-0001-32: survives storage that throws or is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    } as unknown as Storage;
    expect(loadTheme(broken)).toBe("system");
    expect(() => {
      saveTheme("light", broken);
    }).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(loadTheme(undefined)).toBe("system");
  });

  it("REQ-0001-32: Light and Dark set data-theme; System removes it", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    applyTheme("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
