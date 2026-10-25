import { logWarning } from "@/lib/error-logging";
import { DEFAULT_THEME, type Theme, THEME_STORAGE_KEY, ThemeSchema } from "@/lib/theme";

/** `localStorage` is absent during the server render and can be blocked by the browser. */
function browserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

/** The saved choice, or System when there is none or it is not one of the three (REQ-0001-32). */
export function loadTheme(storage: Storage | undefined = browserStorage()): Theme {
  let text: string | null;
  try {
    text = storage?.getItem(THEME_STORAGE_KEY) ?? null;
  } catch (error) {
    logWarning("Theme storage is unavailable; using the system theme", {
      context: "theme-storage.load",
      reason: error instanceof Error ? error.name : "unknown",
    });
    return DEFAULT_THEME;
  }
  const parsed = ThemeSchema.safeParse(text);
  return parsed.success ? parsed.data : DEFAULT_THEME;
}

export function saveTheme(theme: Theme, storage: Storage | undefined = browserStorage()): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // The theme still applies for this visit; it just won't be remembered.
    logWarning("Could not save the theme", {
      context: "theme-storage.save",
      reason: error instanceof Error ? error.name : "unknown",
    });
  }
}

/** Forces Light or Dark with `data-theme`, or removes it so System follows the device. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}
