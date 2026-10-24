import { type GameState, GameStateSchema } from "@/lib/game";
import { logError, logWarning } from "@/lib/error-logging";

/** Same key as the prototype so the saved format stays stable (REQ-0001-25). */
// A localStorage key name, not a credential; gitleaks' generic-api-key rule misreads it.
export const STORAGE_KEY = "chip-ledger.v1"; // gitleaks:allow

/** `localStorage` is absent during the server render and can be blocked by the browser. */
function browserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

/**
 * The saved game, or `null` when there is none or it fails validation (REQ-0001-26). Storage
 * that is missing or throws (private mode, disabled cookies) is treated as empty.
 */
export function loadSavedGame(storage: Storage | undefined = browserStorage()): GameState | null {
  let text: string | null;
  try {
    text = storage?.getItem(STORAGE_KEY) ?? null;
  } catch (error) {
    logError(error, { context: "game-storage.load" });
    return null;
  }
  if (text === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logWarning("Saved game is not JSON; starting fresh", { context: "game-storage.load" });
    return null;
  }
  const parsed = GameStateSchema.safeParse(json);
  if (!parsed.success) {
    logWarning("Saved game failed validation; starting fresh", {
      context: "game-storage.load",
      issues: parsed.error.issues.length,
    });
    return null;
  }
  return parsed.data;
}

export function saveGame(game: GameState, storage: Storage | undefined = browserStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch (error) {
    // The app keeps working in memory; the game just won't survive a reload.
    logError(error, { context: "game-storage.save" });
  }
}
