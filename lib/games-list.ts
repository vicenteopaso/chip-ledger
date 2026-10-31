import type { GameState } from "@/lib/game";
import { activePlayers } from "@/lib/game";

/** The longest title kept for the Games list. */
const MAX_TITLE = 80;

/**
 * What the Games list calls a game: the players' names, as many as fit ("Ana, Ben, Cy and 2
 * more"), or the number of players when nobody has a name yet (SPEC-0003 REQ-0003-17). Names are
 * kept on this device only, in the list; they are not sent anywhere.
 */
export function gameTitle(game: Pick<GameState, "count" | "players">): string {
  const names = activePlayers(game as GameState)
    .map((player) => player.name.trim())
    .filter((name) => name !== "");
  if (names.length === 0) return `Game with ${String(game.count)} players`;
  const shown = names.slice(0, 3).join(", ");
  const more = names.length - 3;
  const title = more > 0 ? `${shown} and ${String(more)} more` : shown;
  return title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE - 1)}…` : title;
}
