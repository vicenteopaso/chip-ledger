import { activePlayers, type GameState, moneyIn, playerName, pot } from "@/lib/game";
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
  if (!changed) return chipSale(previous, next, money);
  const buyins = `${String(changed.buyins)} ${changed.buyins === 1 ? "buy-in" : "buy-ins"}`;
  return `${playerName(next, changed)}: ${buyins}, pot ${money(pot(next))}`;
}

/** "Chip sale: Ana now $15.00 in, Ben now $25.00 in", or `null` when no sale changed an amount. */
function chipSale(previous: GameState, next: GameState, money: MoneyFormatter): string | null {
  const sales = activePlayers(next).flatMap((player, index) => {
    const before = previous.players[index]?.moved;
    if (before === undefined || player.moved === before) return [];
    return [`${playerName(next, player)} now ${money(moneyIn(next, player))} in`];
  });
  return sales.length > 0 ? `Chip sale: ${sales.join(", ")}` : null;
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
  const sale = chipSale(previous, next, money);
  if (sale) parts.push(sale);
  return parts.length > 0 ? parts.join(", ") : null;
}
