import { z } from "zod";

/** `system` follows the device's color scheme; the others force one theme (REQ-0001-32). */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const ThemeSchema = z.enum(THEMES);

export const DEFAULT_THEME: Theme = "system";

/** Separate from the saved game, so "Start over" never erases it. */
export const THEME_STORAGE_KEY = "chip-ledger.theme";

export const THEME_LABELS: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/** System → Light → Dark → System. */
export function nextTheme(theme: Theme): Theme {
  const index = THEMES.indexOf(theme);
  return THEMES[(index + 1) % THEMES.length] ?? DEFAULT_THEME;
}

/**
 * Runs in the document head before the first paint so a forced theme does not flash the
 * other one. Keep it in step with `applyTheme` in lib/infra/theme-storage.ts.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
