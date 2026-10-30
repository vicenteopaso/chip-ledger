import { planChips, planUniformChip } from "@/lib/chip-plan";
import { availableColors, type ChipColor } from "@/lib/chips";
import {
  type GameState,
  type SpreadBy,
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Player,
  type Screen,
  stackValue,
  UNIFORM_CHIP_ID,
} from "@/lib/game";
import { type Currency, currencyDigits, typicalBuyIn } from "@/lib/money";

/** Count and value given to a newly added chip color (REQ-0001-05). */
export const NEW_CHIP_COUNT = 5;
export const NEW_CHIP_VALUE = 5;

/**
 * Every change to the game. Ids and replacement games are created by the caller so the reducer
 * stays pure and deterministic.
 */
export type GameAction =
  | { type: "go"; screen: Screen }
  | { type: "setPlayerCount"; count: number }
  | { type: "setName"; playerId: string; name: string }
  | { type: "setBuyIn"; buyIn: number }
  | { type: "setCurrency"; currency: Currency }
  | { type: "addChip"; chipId: string }
  | { type: "removeChip"; chipId: string }
  | { type: "setChipColor"; chipId: string; color: ChipColor }
  | { type: "setChipCount"; chipId: string; count: number }
  | { type: "setChipValue"; chipId: string; value: number }
  | { type: "setUniformValue"; enabled: boolean }
  | { type: "setUniformChipCount"; count: number }
  | { type: "setUniformChipValue"; value: number }
  | { type: "adjustBuyins"; playerId: string; delta: 1 | -1 }
  | { type: "setPlayerChipCount"; playerId: string; chipId: string; count: number | null }
  | { type: "applyPhotoCounts"; playerId: string; counts: Partial<Record<ChipColor, number>> }
  | { type: "autoFillChips"; chipIds: readonly [string, string, string] }
  | { type: "setScale"; scale: boolean }
  | { type: "setSpreadBy"; spreadBy: SpreadBy }
  | { type: "newGameSamePlayers" }
  | { type: "replace"; game: GameState };

function updatePlayer(
  game: GameState,
  playerId: string,
  update: (player: Player) => Player,
): GameState {
  return {
    ...game,
    players: game.players.map((player) => (player.id === playerId ? update(player) : player)),
  };
}

function updateChip(
  game: GameState,
  chipId: string,
  update: (chip: GameState["chips"][number]) => GameState["chips"][number],
): GameState {
  return { ...game, chips: game.chips.map((chip) => (chip.id === chipId ? update(chip) : chip)) };
}

/** A hand edit of the chips ends the automatic balancing (REQ-0001-29). */
function edited(game: GameState): GameState {
  return { ...game, autoChips: false };
}

/**
 * Recalculates the chips for the current buy-in and currency while they are balanced
 * automatically. A row set that was changed by hand never reaches here (see `edited`).
 */
function balanced(game: GameState): GameState {
  if (!game.autoChips) return game;
  const planned = planChips(game.buyIn, game.currency);
  const uniformChip = planUniformChip(game.buyIn, game.currency);
  if (!planned || !uniformChip) return game;
  return {
    ...game,
    uniformChip,
    chips: game.chips.map((chip, i) => ({
      ...chip,
      count: planned[i]?.count ?? chip.count,
      value: planned[i]?.value ?? chip.value,
    })),
  };
}

export function gameReducer(game: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "go":
      return { ...game, screen: action.screen };
    case "setPlayerCount":
      return { ...game, count: Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, action.count)) };
    case "setName":
      return updatePlayer(game, action.playerId, (player) => ({ ...player, name: action.name }));
    case "setBuyIn":
      return balanced({ ...game, buyIn: action.buyIn });
    case "setCurrency": {
      // Move an untouched typical buy-in to the new currency's scale: 20 USD → 10,000 CLP.
      const untouched = game.buyIn === typicalBuyIn(game.currency);
      const buyIn = untouched ? typicalBuyIn(action.currency) : game.buyIn;
      return balanced({ ...game, currency: action.currency, buyIn });
    }
    case "autoFillChips": {
      const chips = (["white", "red", "blue"] as const).map((color, i) => ({
        id: game.chips[i]?.id ?? action.chipIds[i] ?? color,
        color,
        count: 0,
        value: 0,
      }));
      return balanced({ ...game, autoChips: true, chips });
    }
    case "addChip": {
      const [color] = availableColors(game.chips.map((chip) => chip.color));
      if (!color) return game;
      return {
        ...edited(game),
        chips: [
          ...game.chips,
          { id: action.chipId, color, count: NEW_CHIP_COUNT, value: NEW_CHIP_VALUE },
        ],
      };
    }
    case "removeChip":
      if (game.chips.length < 2) return game;
      return { ...edited(game), chips: game.chips.filter((chip) => chip.id !== action.chipId) };
    case "setChipColor": {
      const taken = game.chips.some(
        (chip) => chip.id !== action.chipId && chip.color === action.color,
      );
      if (taken) return game;
      return updateChip(edited(game), action.chipId, (chip) => ({ ...chip, color: action.color }));
    }
    case "setChipCount":
      return updateChip(edited(game), action.chipId, (chip) => ({ ...chip, count: action.count }));
    case "setChipValue":
      return updateChip(edited(game), action.chipId, (chip) => ({ ...chip, value: action.value }));
    case "setUniformValue": {
      if (!action.enabled) return { ...game, uniformValue: false };
      if (game.autoChips) return balanced({ ...game, uniformValue: true });
      // Start from the color rows: same chips per player, and the same stack value when it
      // divides evenly into the currency's smallest unit.
      const colorRows = { ...game, uniformValue: false };
      const count = game.chips.reduce((sum, chip) => sum + chip.count, 0);
      const scale = 10 ** currencyDigits(game.currency);
      const value = count > 0 ? Math.round((stackValue(colorRows) / count) * scale) / scale : 0;
      return { ...game, uniformValue: true, uniformChip: { count, value } };
    }
    case "setUniformChipCount":
      return { ...edited(game), uniformChip: { ...game.uniformChip, count: action.count } };
    case "setUniformChipValue":
      return { ...edited(game), uniformChip: { ...game.uniformChip, value: action.value } };
    case "adjustBuyins":
      return updatePlayer(game, action.playerId, (player) => ({
        ...player,
        buyins: Math.max(0, player.buyins + action.delta),
      }));
    case "setPlayerChipCount":
      return updatePlayer(game, action.playerId, (player) => {
        const others = Object.entries(player.counts).filter(([id]) => id !== action.chipId);
        const counts = Object.fromEntries(others);
        if (action.count !== null) counts[action.chipId] = action.count;
        return { ...player, counts };
      });
    case "applyPhotoCounts":
      return updatePlayer(game, action.playerId, (player) => {
        const counts = { ...player.counts };
        if (game.uniformValue) {
          // One-value mode: every counted color adds to the single "All colors" count.
          counts[UNIFORM_CHIP_ID] = game.chips.reduce(
            (sum, chip) => sum + (action.counts[chip.color] ?? 0),
            0,
          );
        } else {
          for (const chip of game.chips) counts[chip.id] = action.counts[chip.color] ?? 0;
        }
        return { ...player, counts };
      });
    case "setScale":
      return { ...game, scale: action.scale };
    case "setSpreadBy":
      return { ...game, spreadBy: action.spreadBy };
    case "newGameSamePlayers":
      return {
        ...game,
        screen: "table",
        players: game.players.map((player) => ({ ...player, buyins: 1, counts: {} })),
      };
    case "replace":
      return action.game;
  }
}
