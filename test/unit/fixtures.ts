import { createGame, type GameState } from "@/lib/game";
import { sequentialIds } from "@/lib/ids";
import { moneyFormatter } from "@/lib/money";

/** The default game with predictable ids: players p1…p6, chips c… (white, red, blue). */
export function defaultGame(): GameState {
  const game = createGame(sequentialIds("id"));
  return {
    ...game,
    players: game.players.map((player, i) => ({ ...player, id: `p${String(i + 1)}` })),
    chips: game.chips.map((chip) => ({ ...chip, id: chip.color })),
  };
}

/** Default game with named players and per-player chip counts keyed by color id. */
export function gameWith(overrides: Partial<GameState> = {}): GameState {
  return { ...defaultGame(), ...overrides };
}

export const usd = moneyFormatter("USD", "en-US");
