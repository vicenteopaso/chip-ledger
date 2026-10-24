import { availableColors, type ChipColor } from "@/lib/chips";
import type { GameState, Player, PlayerCount, Screen } from "@/lib/game";
import type { Currency } from "@/lib/money";

/** Count and value given to a newly added chip color (REQ-0001-05). */
export const NEW_CHIP_COUNT = 5;
export const NEW_CHIP_VALUE = 5;

/**
 * Every change to the game. Ids and replacement games are created by the caller so the reducer
 * stays pure and deterministic.
 */
export type GameAction =
  | { type: "go"; screen: Screen }
  | { type: "setPlayerCount"; count: PlayerCount }
  | { type: "setName"; playerId: string; name: string }
  | { type: "setBuyIn"; buyIn: number }
  | { type: "setCurrency"; currency: Currency }
  | { type: "addChip"; chipId: string }
  | { type: "removeChip"; chipId: string }
  | { type: "setChipColor"; chipId: string; color: ChipColor }
  | { type: "setChipCount"; chipId: string; count: number }
  | { type: "setChipValue"; chipId: string; value: number }
  | { type: "setUniformValue"; enabled: boolean }
  | { type: "setAllChipValues"; value: number }
  | { type: "adjustBuyins"; playerId: string; delta: 1 | -1 }
  | { type: "setPlayerChipCount"; playerId: string; chipId: string; count: number | null }
  | { type: "applyPhotoCounts"; playerId: string; counts: Partial<Record<ChipColor, number>> }
  | { type: "setScale"; scale: boolean }
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

export function gameReducer(game: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "go":
      return { ...game, screen: action.screen };
    case "setPlayerCount":
      return { ...game, count: action.count };
    case "setName":
      return updatePlayer(game, action.playerId, (player) => ({ ...player, name: action.name }));
    case "setBuyIn":
      return { ...game, buyIn: action.buyIn };
    case "setCurrency":
      return { ...game, currency: action.currency };
    case "addChip": {
      const [color] = availableColors(game.chips.map((chip) => chip.color));
      if (!color) return game;
      const value = game.uniformValue ? (game.chips[0]?.value ?? NEW_CHIP_VALUE) : NEW_CHIP_VALUE;
      return {
        ...game,
        chips: [...game.chips, { id: action.chipId, color, count: NEW_CHIP_COUNT, value }],
      };
    }
    case "removeChip":
      if (game.chips.length < 2) return game;
      return { ...game, chips: game.chips.filter((chip) => chip.id !== action.chipId) };
    case "setChipColor": {
      const taken = game.chips.some(
        (chip) => chip.id !== action.chipId && chip.color === action.color,
      );
      if (taken) return game;
      return updateChip(game, action.chipId, (chip) => ({ ...chip, color: action.color }));
    }
    case "setChipCount":
      return updateChip(game, action.chipId, (chip) => ({ ...chip, count: action.count }));
    case "setChipValue":
      return updateChip(game, action.chipId, (chip) => ({ ...chip, value: action.value }));
    case "setUniformValue": {
      if (!action.enabled) return { ...game, uniformValue: false };
      const value = game.chips[0]?.value ?? NEW_CHIP_VALUE;
      return {
        ...game,
        uniformValue: true,
        chips: game.chips.map((chip) => ({ ...chip, value })),
      };
    }
    case "setAllChipValues":
      return { ...game, chips: game.chips.map((chip) => ({ ...chip, value: action.value })) };
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
        for (const chip of game.chips) counts[chip.id] = action.counts[chip.color] ?? 0;
        return { ...player, counts };
      });
    case "setScale":
      return { ...game, scale: action.scale };
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
