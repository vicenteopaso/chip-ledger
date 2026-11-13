/**
 * How a device keeps up with a shared game (SPEC-0003, ADR-0005 addendum): how often it asks, how
 * it backs off when asking fails, and what it tells the person. Pure; the hook supplies the clock.
 */

/** Right after a change the game is probably busy; later it is mostly quiet. */
export const POLL_FAST_MS = 2000;
export const POLL_QUIET_MS = 5000;
export const FAST_WINDOW_MS = 60_000;

/** The next check: quick for a minute after a change, then relaxed (plan §5, command budget). */
export function pollDelayMs(lastChangeAt: number, now: number): number {
  return now - lastChangeAt < FAST_WINDOW_MS ? POLL_FAST_MS : POLL_QUIET_MS;
}

/** After a failed check, wait longer each time: 2 s, 4 s, 8 s, 16 s, then 30 s. */
export function retryDelayMs(failures: number): number {
  return Math.min(30_000, 2000 * 2 ** Math.max(0, failures - 1));
}

export type ConnectionStatus = "live" | "reconnecting" | "offline";

/**
 * One missed check is a hiccup; three in a row means the device is effectively offline. A check
 * the server refused for being too frequent proves the device is online, so it is never shown as
 * Offline (REQ-0006-11).
 */
export function connectionStatus(
  failures: number,
  { limited = false }: { limited?: boolean } = {},
): ConnectionStatus {
  if (failures <= 0) return "live";
  return failures < 3 || limited ? "reconnecting" : "offline";
}

/** What a screen reader hears when the status changes (REQ-0003-13); nothing if it did not. */
export function statusAnnouncement(from: ConnectionStatus, to: ConnectionStatus): string | null {
  if (from === to) return null;
  if (to === "live") return "Live again.";
  if (to === "reconnecting") return "Reconnecting.";
  return "You're offline. The game will update when the connection returns.";
}

/**
 * The visible text of the status row (REQ-0003-13, -14). While changes wait to be sent it says
 * so, so nobody thinks they were lost.
 */
/** Says what the device count leaves out, so a locked phone isn't read as someone leaving (REQ-0006-14). */
export const NOT_COUNTED_NOTE = "Phones that are locked or in another app aren't counted.";

export function statusText(status: ConnectionStatus, online: number | null, pending = 0): string {
  if (status === "reconnecting") {
    return pending > 0 ? "Reconnecting… your changes will sync." : "Reconnecting…";
  }
  if (status === "offline") {
    return pending > 0
      ? "Offline. Your changes will sync when the connection returns."
      : "Offline. Showing the last version.";
  }
  // The count is devices with the game open, not people at the table (REQ-0006-13).
  if (online === null) return "Live";
  return `${String(online)} ${online === 1 ? "phone" : "phones"} live`;
}
