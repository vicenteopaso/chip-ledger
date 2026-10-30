import { z } from "zod";

import { planChips, planUniformChip } from "@/lib/chip-plan";
import { CHIP_COLORS, ChipColorSchema, MIXED, type StackColor } from "@/lib/chips";
import { CurrencySchema, MAX_AMOUNT, MAX_COUNT, typicalBuyIn } from "@/lib/money";

export const SCREENS = ["setup", "table", "cashout", "settle"] as const;
export type Screen = (typeof SCREENS)[number];

/** Each step's page title, used for the document title (REQ-0002-02). */
export const STEP_TITLES: Record<Screen, string> = {
  setup: "Setup",
  table: "At the table",
  cashout: "Cash out",
  settle: "Settle up",
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const DEFAULT_PLAYERS = 4;

/** Ten slots are always kept so names survive changing the player count (REQ-0001-03). */
export const PLAYER_SLOTS = MAX_PLAYERS;

/** Stack values within half a cent of each other are treated as equal. */
export const MONEY_EPSILON = 0.005;

export const IdSchema = z.string().min(1).max(64);
export const AmountSchema = z.number().min(-MAX_AMOUNT).max(MAX_AMOUNT);
export const CountSchema = z.number().int().min(0).max(MAX_COUNT);

export const ChipSchema = z.object({
  id: IdSchema,
  color: ChipColorSchema,
  count: CountSchema,
  value: AmountSchema,
});

export const PlayerSchema = z.object({
  id: IdSchema,
  name: z.string().max(200),
  buyins: CountSchema,
  counts: z.record(z.string(), CountSchema),
});

/** How a pot difference is shared when spreading is on (REQ-0002-33). */
export const SPREAD_BY = ["chips", "equal"] as const;
export type SpreadBy = (typeof SPREAD_BY)[number];

/**
 * Saved game state. Same JSON shape as the prototype's `chip-ledger.v1` value (REQ-0001-25).
 * Parsed on load because browser storage is external input (REQ-0001-26, CONSTITUTION-10).
 */
const GameFieldsSchema = z.object({
  screen: z.enum(SCREENS),
  count: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
  buyIn: AmountSchema,
  currency: CurrencySchema,
  scale: z.boolean(),
  /** How `scale` shares the difference (REQ-0002-33). Absent in games saved before it existed. */
  spreadBy: z.enum(SPREAD_BY).default("chips"),
  /** Every chip shares one value (REQ-0001-28). Absent in games saved before it existed. */
  uniformValue: z.boolean().default(false),
  /** Chips follow the buy-in until the host edits one (REQ-0001-29). False for older saved games. */
  autoChips: z.boolean().default(false),
  /** The single "All colors" chip used while `uniformValue` is on. */
  uniformChip: z
    .object({ count: CountSchema, value: AmountSchema })
    .default({ count: 0, value: 0 }),
  players: z.array(PlayerSchema).min(MIN_PLAYERS).max(PLAYER_SLOTS),
  chips: z
    .array(ChipSchema)
    .min(1)
    .max(CHIP_COLORS.length)
    .refine((chips) => new Set(chips.map((chip) => chip.color)).size === chips.length, {
      message: "Chip colors must be unique",
    }),
});

export const GameStateSchema = GameFieldsSchema.refine(
  (game) => game.count <= game.players.length,
  { message: "Player count exceeds the player slots", path: ["count"] },
).transform((game) => ({
  ...game,
  // Games saved with fewer slots (the first version kept six) get the missing ones, empty.
  players: [
    ...game.players,
    ...Array.from({ length: PLAYER_SLOTS - game.players.length }, (_, i) => ({
      id: `slot-${String(game.players.length + i + 1)}`,
      name: "",
      buyins: 1,
      counts: {},
    })),
  ],
}));

export type Chip = z.infer<typeof ChipSchema>;
export type Player = z.infer<typeof PlayerSchema>;
export type GameState = z.infer<typeof GameStateSchema>;

export type IdFactory = () => string;

/** A new player with one buy-in and no counted chips. */
export function newPlayer(id: string): Player {
  return { id, name: "", buyins: 1, counts: {} };
}

/** The default game (REQ-0001-26, -29): 4 players, 10 EUR, spread on, balanced white/red/blue chips. */
export function createGame(newId: IdFactory): GameState {
  const currency = "EUR";
  const buyIn = typicalBuyIn(currency);
  const players = Array.from({ length: PLAYER_SLOTS }, () => newPlayer(newId()));
  const planned = planChips(buyIn, currency) ?? [];
  return {
    screen: "setup",
    count: DEFAULT_PLAYERS,
    buyIn,
    currency,
    scale: true,
    spreadBy: "chips",
    uniformValue: false,
    autoChips: true,
    uniformChip: planUniformChip(buyIn, currency) ?? { count: 0, value: 0 },
    players,
    chips: planned.map((chip) => ({ id: newId(), ...chip })),
  };
}

export function activePlayers(game: GameState): Player[] {
  return game.players.slice(0, game.count);
}

/** "Player N" for a blank name, where N is the slot number (REQ-0001-03). */
export function playerName(game: GameState, player: Player): string {
  return player.name.trim() || `Player ${game.players.indexOf(player) + 1}`;
}

/** Player counts for the "All colors" chip are stored under this id. */
export const UNIFORM_CHIP_ID = "all";

/** A chip row as the game uses it: one of the color rows, or the single "All colors" chip. */
export type StackChip = { id: string; color: StackColor; count: number; value: number };

/** The chips in play: the color rows, or only the "All colors" chip in one-value mode (REQ-0001-28). */
export function stackChips(game: GameState): StackChip[] {
  if (!game.uniformValue) return game.chips;
  return [{ id: UNIFORM_CHIP_ID, color: MIXED, ...game.uniformChip }];
}

/** Face value of one starting stack. */
export function stackValue(game: GameState): number {
  return stackChips(game).reduce((sum, chip) => sum + chip.count * chip.value, 0);
}

/** Money per unit of chip face value: buy-in ÷ stack value, or 1 with no stack (REQ-0001-11). */
export function cashOutRate(game: GameState): number {
  const face = stackValue(game);
  return face > 0 ? game.buyIn / face : 1;
}

export function totalBuyins(game: GameState): number {
  return activePlayers(game).reduce((sum, player) => sum + player.buyins, 0);
}

export function pot(game: GameState): number {
  return totalBuyins(game) * game.buyIn;
}

export function chipFaceValue(game: GameState, player: Player): number {
  return stackChips(game).reduce(
    (sum, chip) => sum + (player.counts[chip.id] ?? 0) * chip.value,
    0,
  );
}

export function cashOutValue(game: GameState, player: Player): number {
  return chipFaceValue(game, player) * cashOutRate(game);
}

/** Chips of one row issued across the whole game. */
export function issuedChips(game: GameState, chip: StackChip): number {
  return chip.count * totalBuyins(game);
}

export function countedChips(game: GameState, chip: StackChip): number {
  return activePlayers(game).reduce((sum, player) => sum + (player.counts[chip.id] ?? 0), 0);
}

export function countedValue(game: GameState): number {
  return activePlayers(game).reduce((sum, player) => sum + cashOutValue(game, player), 0);
}

/** "Start the game" is allowed only with a buy-in and a stack worth something (REQ-0001-07). */
export function canStartGame(game: GameState): boolean {
  return game.buyIn > 0 && stackValue(game) > 0;
}
