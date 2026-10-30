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
