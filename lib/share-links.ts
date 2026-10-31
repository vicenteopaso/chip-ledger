import type { Role } from "@/lib/shared-game";

/** The two kinds of link a game can be shared with (SPEC-0003 REQ-0003-03). */
export const LINK_KINDS = ["watch", "edit"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

/** The link that opens a game with the access its key grants; the key follows `#` (REQ-0003-04). */
export function shareLink(origin: string, id: string, key: string): string {
  return `${origin}/g/${id}#k=${key}`;
}

/** What the host is told before the first share, and can read again in the sheet (REQ-0003-22). */
export const RETENTION_NOTICE =
  "Sharing keeps this game, including player names, on a server. It is kept until 24 hours after the last time anyone uses it, then stays read-only for 30 days, then is deleted. An editor can delete it sooner.";

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
