import { planChips, planUniformChip } from "@/lib/chip-plan";
import { createGame, type GameState } from "@/lib/game";
import { sequentialIds } from "@/lib/ids";
import { moneyFormatter } from "@/lib/money";

/**
 * A 20 USD game with predictable ids (players p1…p6; chips white, red, blue) and balanced
 * chips: 20 × 0.25, 10 × 0.5, 10 × 1. Not the app's default (10 EUR), so tests read in dollars.
 */
export function defaultGame(): GameState {
  const game = createGame(sequentialIds("id"));
  return {
    ...game,
    currency: "USD",
    buyIn: 20,
    uniformChip: planUniformChip(20, "USD") ?? { count: 0, value: 0 },
    players: game.players.map((player, i) => ({ ...player, id: `p${String(i + 1)}` })),
    chips: (planChips(20, "USD") ?? []).map((chip) => ({ ...chip, id: chip.color })),
  };
}

/** Default game with named players and per-player chip counts keyed by color id. */
export function gameWith(overrides: Partial<GameState> = {}): GameState {
  return { ...defaultGame(), ...overrides };
}

export const usd = moneyFormatter("USD", "en-US");
