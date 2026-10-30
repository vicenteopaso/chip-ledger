import {
  applyAction,
  type EditEnvelope,
  type SharedAction,
  type SharedState,
} from "@/lib/shared-game";

/**
 * Edits a device has made but the server has not confirmed yet (SPEC-0003 REQ-0003-10, -14). The
 * screen shows the server's game with these applied on top, so a change appears at once; each
 * snapshot from the server replaces the base and the unconfirmed edits are applied again.
 */
export type PendingEdit = {
  actionId: string;
  action: SharedAction;
  /** When the person made the change; how long it waited becomes `queuedMs` when it is sent. */
  queuedAt: number;
};

/**
 * Edits that only set a value share a key with the next edit of the same field, so typing a
 * name sends the latest text, not every letter. Anything that adds, removes, or counts up is
 * never merged, because each one matters (REQ-0003-11).
 */
export function coalesceKey(action: SharedAction): string | null {
  switch (action.type) {
    case "setPlayerCount":
      return "player-count";
    case "setName":
      return `name:${action.playerId}`;
    case "setBuyIn":
      return "buy-in";
    case "setCurrency":
      return "currency";
    case "setChipColor":
      return `chip-color:${action.chipId}`;
    case "setChipCount":
      return `chip-count:${action.chipId}`;
    case "setChipValue":
      return `chip-value:${action.chipId}`;
    case "setUniformValue":
      return "uniform-value";
    case "setUniformChipCount":
      return "uniform-count";
    case "setUniformChipValue":
      return "uniform-chip-value";
    case "setPlayerChipCount":
      return `player-chips:${action.playerId}:${action.chipId}`;
    case "setScale":
      return "scale";
    case "setSpreadBy":
      return "spread-by";
    // These add, remove, or count up: every one matters, so none is ever merged.
    case "addChip":
    case "removeChip":
    case "adjustBuyins":
    case "applyPhotoCounts":
    case "autoFillChips":
    case "startGame":
      return null;
  }
}

/**
 * Adds an edit to the end of the queue. If the last edit sets the same field and has not been
 * sent (`sendingId` is the one on its way), it is replaced instead.
 */
export function enqueue(
  pending: readonly PendingEdit[],
  edit: PendingEdit,
  sendingId: string | null,
): PendingEdit[] {
  const last = pending.at(-1);
  const key = coalesceKey(edit.action);
  if (last && key !== null && last.actionId !== sendingId && coalesceKey(last.action) === key) {
    return [...pending.slice(0, -1), { ...edit, queuedAt: last.queuedAt }];
  }
  return [...pending, edit];
}

/**
 * The game as this device should show it: the server's, then every unconfirmed edit in order. An
 * edit that no longer applies (the game changed under it) is skipped, not an error.
 */
export function project(base: SharedState, pending: readonly PendingEdit[]): SharedState {
  let state = base;
  for (const edit of pending) state = applyAction(state, edit.action) ?? state;
  return state;
}

/** The request body for one pending edit (REQ-0003-10, -14). */
export function toEnvelope(edit: PendingEdit, baseRev: number, now: number): EditEnvelope {
  return {
    actionId: edit.actionId,
    baseRev,
    queuedMs: Math.max(0, Math.round(now - edit.queuedAt)),
    action: edit.action,
  };
}
