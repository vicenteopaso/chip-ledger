import { z } from "zod";

import { logError, logWarning } from "@/lib/error-logging";
import { GameIdSchema, KeySchema } from "@/lib/shared-game";

/**
 * The shared games this browser has opened, each with the key its link carried, so a reload still
 * works after the key is taken out of the address bar (SPEC-0003 REQ-0003-04). Parsed on load:
 * browser storage is external input. The key is a credential, so it never goes in a URL or a log.
 */

// A localStorage key name, not a credential; gitleaks' generic-api-key rule misreads it.
export const JOINED_KEY = "chip-ledger.joined.v1"; // gitleaks:allow
const MAX_GAMES = 20;

const JoinedSchema = z.array(z.object({ id: GameIdSchema, key: KeySchema }));
type Joined = z.infer<typeof JoinedSchema>;

function browserStorage(): Storage | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function load(storage: Storage | undefined): Joined {
  let text: string | null;
  try {
    text = storage?.getItem(JOINED_KEY) ?? null;
  } catch (error) {
    logError(error, { context: "joined-games-storage.load" });
    return [];
  }
  if (text === null) return [];
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    logWarning("Joined games are not JSON; starting empty", {
      context: "joined-games-storage.load",
    });
    return [];
  }
  const parsed = JoinedSchema.safeParse(json);
  if (!parsed.success) {
    logWarning("Joined games failed validation; starting empty", {
      context: "joined-games-storage.load",
    });
    return [];
  }
  return parsed.data;
}

function save(joined: Joined, storage: Storage | undefined): void {
  try {
    storage?.setItem(JOINED_KEY, JSON.stringify(joined));
  } catch (error) {
    // The key stays in memory for this visit; a reload would need the link again.
    logError(error, { context: "joined-games-storage.save" });
  }
}

/** The key stored for a game, or `null`. */
export function keyFor(id: string, storage: Storage | undefined = browserStorage()): string | null {
  return load(storage).find((entry) => entry.id === id)?.key ?? null;
}

/** Remembers a key, replacing an older one for the same game and keeping the newest 20. */
export function rememberKey(
  id: string,
  key: string,
  storage: Storage | undefined = browserStorage(),
): void {
  const others = load(storage).filter((entry) => entry.id !== id);
  save([...others, { id, key }].slice(-MAX_GAMES), storage);
}

export function forgetGame(id: string, storage: Storage | undefined = browserStorage()): void {
  save(
    load(storage).filter((entry) => entry.id !== id),
    storage,
  );
}
