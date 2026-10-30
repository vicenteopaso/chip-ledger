import { activePlayers, type GameState, playerName, pot } from "@/lib/game";
import type { MoneyFormatter } from "@/lib/money";

/**
 * What the screen-reader announcer says after an edit on the same step (REQ-0002-07): the new
 * player count, or the player whose buy-ins changed with the new pot. `null` when the edit
 * needs no announcement (the field being typed in already speaks for itself).
 */
export function changeAnnouncement(
  previous: GameState,
  next: GameState,
  money: MoneyFormatter,
): string | null {
  if (next.count !== previous.count) {
    return `${String(next.count)} players`;
  }
  const changed = activePlayers(next).find(
    (player, index) => player.buyins !== previous.players[index]?.buyins,
  );
  if (!changed) return null;
  const buyins = `${String(changed.buyins)} ${changed.buyins === 1 ? "buy-in" : "buy-ins"}`;
  return `${playerName(next, changed)}: ${buyins}, pot ${money(pot(next))}`;
}

/**
 * Everything that changed between two versions of a shared game, in one sentence, for the live
 * region (REQ-0003-29): the player count, and each player whose buy-ins changed, then the pot. A
 * burst of changes from several devices becomes one announcement, not one per change.
 */
export function remoteChanges(
  previous: GameState,
  next: GameState,
  money: MoneyFormatter,
): string | null {
  const parts: string[] = [];
  if (next.count !== previous.count) parts.push(`${String(next.count)} players`);
  const rebuys = activePlayers(next).flatMap((player, index) => {
    const before = previous.players[index]?.buyins;
    if (before === undefined || player.buyins === before) return [];
    const unit = player.buyins === 1 ? "buy-in" : "buy-ins";
    return [`${playerName(next, player)}: ${String(player.buyins)} ${unit}`];
  });
  parts.push(...rebuys);
  if (rebuys.length > 0) parts.push(`pot ${money(pot(next))}`);
  return parts.length > 0 ? parts.join(", ") : null;
}
