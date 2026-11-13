import type { Role } from "@/lib/shared-game";

/** The two kinds of link a game can be shared with (SPEC-0003 REQ-0003-03). */
export const LINK_KINDS = ["watch", "edit"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

/**
 * The link that opens a game with the access its key grants; the key follows `#` (REQ-0003-04).
 * An edit link also carries the game's watch key, so the device that opens it can show the
 * watch-only link in turn (SPEC-0007 REQ-0007-04). A watch link never carries anything else.
 */
export function shareLink(
  origin: string,
  id: string,
  key: string,
  watchKey: string | null = null,
): string {
  const watch = watchKey && watchKey !== key ? `&w=${watchKey}` : "";
  return `${origin}/g/${id}#k=${key}${watch}`;
}

/** What the host is told before the first share, and can read again in the sheet (REQ-0003-22). */
export const RETENTION_NOTICE =
  "Sharing keeps this game, including player names, on a server. It is kept until 24 hours after the last time anyone uses it, then stays read-only for 30 days, then is deleted. An editor can delete it sooner.";

/**
 * Said before the first share: the host keeps playing in the shared game, and this device's own
 * game starts empty so the same game can't be shared twice (SPEC-0006 REQ-0006-05, -06).
 */
export const STAYS_IN_GAME_NOTICE =
  "You keep playing in the shared game, and so does everyone who joins. This device's own game then starts empty, ready for your next game.";

/**
 * Added to the notice before the first share where the page runs in a browser on iPhone or iPad
 * (SPEC-0007 REQ-0007-09): the browser and the home-screen app keep their games separately.
 */
export const SEPARATE_STORAGE_NOTICE =
  "If Chip Ledger is also on your home screen, share from the one you'll keep using: this browser and the home-screen app keep their games separately.";

/**
 * For a device that joined with an edit link made before edit links carried the watch key
 * (SPEC-0007 REQ-0007-05, -07).
 */
export const OLDER_LINK_NOTICE =
  "This device joined with an older edit link, so it can't show the watch-only code. Anyone who joined more recently, or the person who started sharing, can show it. You can still share the edit link below.";

/** Short help under each choice, in plain words. */
export const LINK_HELP: Record<LinkKind, string> = {
  watch: "People with this link can follow the game, but not change anything.",
  edit: "Anyone with this link can change the game, like a co-host.",
};

/** Who can offer which link: a watcher holds only the watch key, an editor the edit key. */
export type Keys = { watch: string | null; edit: string | null };

/** The keys this device can share, from the one it joined with and any watch key it saved. */
export function keysFor(role: Role, key: string, savedWatchKey: string | null): Keys {
  return role === "edit" ? { watch: savedWatchKey, edit: key } : { watch: key, edit: null };
}
