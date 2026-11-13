import { z } from "zod";

import { logError, logWarning } from "@/lib/error-logging";
import { GameIdSchema } from "@/lib/shared-game";

/**
 * Which game this device used last, so opening the app at its home address (and from the
 * installed app's icon) reopens it (SPEC-0006 REQ-0006-01). Kept on the device only and parsed on
 * load, because browser storage is external input. Holds a game id, never a key.
 */

// A localStorage key name, not a credential; gitleaks' generic-api-key rule misreads it.
export const LAST_GAME_KEY = "chip-ledger.last.v1"; // gitleaks:allow

const LastGameSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("own") }).strict(),
  z.object({ kind: z.literal("shared"), id: GameIdSchema }).strict(),
]);
export type LastGame = z.infer<typeof LastGameSchema>;

const OWN: LastGame = { kind: "own" };

function browserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

/** The game used last; the device's own game when nothing (valid) is recorded. */
export function lastGame(storage: Storage | undefined = browserStorage()): LastGame {
  let text: string | null;
  try {
    text = storage?.getItem(LAST_GAME_KEY) ?? null;
  } catch (error) {
    logError(error, { context: "last-game-storage.load" });
    return OWN;
  }
  if (text === null) return OWN;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logWarning("Last game is not JSON; using the device's own game", {
      context: "last-game-storage.load",
    });
    return OWN;
  }
  const parsed = LastGameSchema.safeParse(json);
  if (!parsed.success) {
    logWarning("Last game failed validation; using the device's own game", {
      context: "last-game-storage.load",
    });
    return OWN;
  }
  return parsed.data;
}

export function rememberLastGame(
  game: LastGame,
  storage: Storage | undefined = browserStorage(),
): void {
  try {
    storage?.setItem(LAST_GAME_KEY, JSON.stringify(game));
  } catch (error) {
    // Reopening just falls back to the device's own game.
    logError(error, { context: "last-game-storage.save" });
  }
}
