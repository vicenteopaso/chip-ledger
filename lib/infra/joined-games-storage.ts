import { z } from "zod";

import { logError, logWarning } from "@/lib/error-logging";
import { type Screen, SCREENS } from "@/lib/game";
import { GameIdSchema, KeySchema } from "@/lib/shared-game";

/**
 * The shared games this browser has opened, each with the key its link carried, so a reload still
 * works after the key is taken out of the address bar (SPEC-0003 REQ-0003-04). Parsed on load:
 * browser storage is external input. The key is a credential, so it never goes in a URL or a log.
 */

// A localStorage key name, not a credential; gitleaks' generic-api-key rule misreads it.
export const JOINED_KEY = "chip-ledger.joined.v1"; // gitleaks:allow
const MAX_GAMES = 20;

const JoinedSchema = z.array(
  z.object({
    id: GameIdSchema,
    key: KeySchema,
    /** The watch key, kept by the device that created the game so it can still offer a watch link. */
    watchKey: KeySchema.optional(),
    /** What the Games list calls it: the players' names (REQ-0003-17). */
    title: z.string().max(80).optional(),
    /** What this device can do in it, as last seen. */
    role: z.enum(["watch", "edit"]).optional(),
    /** The step this device was last on, so the game opens there again (REQ-0003-18). */
    step: z.enum(SCREENS).optional(),
    /** When this device last opened it, to put the newest first. */
    visited: z.number().optional(),
  }),
);
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

/** The watch key saved for a game, or `null` when this device was not given one. */
export function watchKeyFor(
  id: string,
  storage: Storage | undefined = browserStorage(),
): string | null {
  return load(storage).find((entry) => entry.id === id)?.watchKey ?? null;
}

/**
 * Remembers a key, replacing an older one for the same game and keeping the newest 20. A device
 * that holds the game's watch key keeps its stronger key when it opens its own watch link, and a
 * watch key given with a new key is saved beside it so the device can still offer a watch link.
 */
export function rememberKey(
  id: string,
  key: string,
  storage: Storage | undefined = browserStorage(),
  watchKey?: string,
): void {
  const joined = load(storage);
  const existing = joined.find((entry) => entry.id === id);
  if (existing?.watchKey === key) return;
  const kept = watchKey ?? existing?.watchKey;
  const others = joined.filter((entry) => entry.id !== id);
  // What this device knows about the game (its name, role and step) survives a change of key.
  const rest = existing ? { ...existing, key, ...(kept ? { watchKey: kept } : {}) } : { id, key };
  save([...others, { ...rest, ...(kept ? { watchKey: kept } : {}) }].slice(-MAX_GAMES), storage);
}

export type JoinedGame = Joined[number];

/** Every game this device has joined or created, the one opened last first (REQ-0003-17). */
export function listGames(storage: Storage | undefined = browserStorage()): JoinedGame[] {
  return load(storage).toSorted((a, b) => (b.visited ?? 0) - (a.visited ?? 0));
}

/** Records what the Games list shows and where to reopen the game. No effect for an unknown game. */
export function updateGame(
  id: string,
  patch: Partial<Pick<JoinedGame, "title" | "role" | "step" | "visited">>,
  storage: Storage | undefined = browserStorage(),
): void {
  const joined = load(storage);
  if (!joined.some((entry) => entry.id === id)) return;
  save(
    joined.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    storage,
  );
}

/** The step this device was last on in a game, or `null` for a game never opened here. */
export function stepFor(
  id: string,
  storage: Storage | undefined = browserStorage(),
): Screen | null {
  return load(storage).find((entry) => entry.id === id)?.step ?? null;
}

export function forgetGame(id: string, storage: Storage | undefined = browserStorage()): void {
  save(
    load(storage).filter((entry) => entry.id !== id),
    storage,
  );
}
