import { z } from "zod";

import { ChipColorSchema } from "@/lib/chips";
import {
  AmountSchema,
  canStartGame,
  CountSchema,
  type GameState,
  GameStateSchema,
  IdSchema,
  SPREAD_BY,
} from "@/lib/game";
import { type GameAction, gameReducer } from "@/lib/game-reducer";
import { CurrencySchema } from "@/lib/money";

/**
 * Rules for shared games (SPEC-0003): what is stored, which edits a client may send, how the server
 * applies one, and when a game is archived. Pure: no I/O, no clocks, no randomness. Time comes in as
 * an argument and random bytes as a function, so everything here is testable.
 */

// --- Identifiers, keys, and limits ---------------------------------------------------------------

/** Public game id: 12 random bytes as base64url (REQ-0003-04, -26). */
export const GameIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16}$/);

/** A watch or edit key: 16 random bytes (128 bits) as base64url (REQ-0003-04). */
export const KeySchema = z.string().regex(/^[A-Za-z0-9_-]{22}$/);

/** A stored game, edit body, or request larger than this is refused (REQ-0003-25). */
export const MAX_GAME_BYTES = 32 * 1024;

/** How many recent action ids a game remembers, so a retried edit is applied once (REQ-0003-11). */
export const RECENT_ACTIONS = 50;

/** An edit held offline longer than this is dropped by the server (plan §5). */
export const MAX_QUEUED_MS = 15 * 60 * 1000;

// --- Lifecycle (REQ-0003-19 to -21) -------------------------------------------------------------

export const ARCHIVE_AFTER_MS = 24 * 60 * 60 * 1000;
export const DELETE_AFTER_ARCHIVE_MS = 30 * 24 * 60 * 60 * 1000;

/** Records live this long after their last activity; the store's TTL does the deleting. */
export const RECORD_TTL_SECONDS = (ARCHIVE_AFTER_MS + DELETE_AFTER_ARCHIVE_MS) / 1000;

export type LifecycleStatus = "active" | "archived";

/** The latest of the last change and the last time any device was connected. */
export function lastActivityAt(updatedAt: number, seenAt: number | null): number {
  return Math.max(updatedAt, seenAt ?? 0);
}

/** A game is archived once 24 hours pass with no change and no connected device. */
export function lifecycleStatus(lastActivity: number, now: number): LifecycleStatus {
  return now - lastActivity > ARCHIVE_AFTER_MS ? "archived" : "active";
}

// --- Edit codes (REQ-0003-08, -09) --------------------------------------------------------------

/** 31 characters with no 0/O, 1/I/L look-alikes. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;
export const CODE_MAX_FAILURES = 5;
export const CODE_LOCKOUT_MS = 60 * 1000;

/**
 * A code from random bytes. Bytes at or above the largest multiple of the alphabet size are
 * discarded, so every character is equally likely.
 */
export function codeFromBytes(randomBytes: (length: number) => Uint8Array): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let code = "";
  while (code.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH * 2)) {
      if (byte < limit && code.length < CODE_LENGTH)
        code += CODE_ALPHABET.charAt(byte % CODE_ALPHABET.length);
    }
  }
  return code;
}

/** Codes are typed by hand: ignore case, spaces, and dashes. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export const CodeSchema = z
  .string()
  .max(32)
  .transform(normalizeCode)
  .pipe(z.string().regex(new RegExp(`^[${CODE_ALPHABET}]{${String(CODE_LENGTH)}}$`)));

export const StoredCodeSchema = z.object({
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  salt: z.string().regex(/^[0-9a-f]{16}$/),
  expiresAt: z.number().int(),
});
export type StoredCode = z.infer<typeof StoredCodeSchema>;

export function codeIsLive(code: StoredCode | null, now: number): code is StoredCode {
  return code !== null && now < code.expiresAt;
}

// --- Game body and stored record ----------------------------------------------------------------

const omitScreen = (game: GameState) =>
  Object.fromEntries(Object.entries(game).filter(([name]) => name !== "screen")) as Omit<
    GameState,
    "screen"
  >;

/**
 * The shared part of a game: everything except the current step, which stays on each device
 * (REQ-0003-15). Parsed with the saved-game rules (REQ-0003-23), so a shared game can never hold
 * a value a saved game could not.
 */
export const SharedGameBodySchema = z
  .preprocess(
    (value) =>
      typeof value === "object" && value !== null ? { ...value, screen: "setup" } : value,
    GameStateSchema,
  )
  .transform(omitScreen);
export type SharedGameBody = z.infer<typeof SharedGameBodySchema>;

export type Role = "watch" | "edit";

const HashSchema = z.string().regex(/^[0-9a-f]{64}$/);

/** The record kept in the store. Hashes and codes never leave the server (REQ-0003-24). */
export const StoredGameSchema = z.object({
  id: GameIdSchema,
  rev: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  started: z.boolean(),
  game: SharedGameBodySchema,
  watchKeyHash: HashSchema,
  editKeyHash: HashSchema,
  code: StoredCodeSchema.nullable(),
  recentActionIds: z.array(z.uuid()).max(RECENT_ACTIONS),
});
export type StoredGame = z.infer<typeof StoredGameSchema>;

/** What a device receives about a game (REQ-0003-05, -13, -20). */
export type GameSnapshot = {
  rev: number;
  started: boolean;
  game: SharedGameBody;
  role: Role;
  archived: boolean;
  online: number;
};

export function toSnapshot(
  doc: StoredGame,
  role: Role,
  status: LifecycleStatus,
  online: number,
): GameSnapshot {
  return {
    rev: doc.rev,
    started: doc.started,
    game: doc.game,
    role,
    archived: status === "archived",
    online,
  };
}

export const CreateGameRequestSchema = z
  .object({ started: z.boolean(), game: SharedGameBodySchema })
  .strict();
export type CreateGameRequest = z.infer<typeof CreateGameRequestSchema>;

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export type NewGameInput = {
  id: string;
  request: CreateGameRequest;
  watchKeyHash: string;
  editKeyHash: string;
  now: number;
};

/** A stored game from a validated request, or `null` when it is too large (REQ-0003-25). */
export function createStoredGame(input: NewGameInput): StoredGame | null {
  if (byteLength(input.request.game) > MAX_GAME_BYTES) return null;
  return {
    id: input.id,
    rev: 0,
    createdAt: input.now,
    updatedAt: input.now,
    started: input.request.started,
    game: input.request.game,
    watchKeyHash: input.watchKeyHash,
    editKeyHash: input.editKeyHash,
    code: null,
    recentActionIds: [],
  };
}

// --- Edits (REQ-0003-06, -07, -10, -11, -23) ----------------------------------------------------

const Id = IdSchema;
const Name = z.string().max(200);
const Delta = z.union([z.literal(1), z.literal(-1)]);

/**
 * Every edit a client may send. The step changes (`go`), whole-game replacement (`replace`), and
 * in-place reset (`newGameSamePlayers`) are not here: they are per-device or create a new game
 * (REQ-0003-15, -16). `startGame` is shared-only.
 */
export const SharedActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("startGame") }).strict(),
  z.object({ type: z.literal("setPlayerCount"), count: z.number().int() }).strict(),
  z.object({ type: z.literal("setName"), playerId: Id, name: Name }).strict(),
  z.object({ type: z.literal("setBuyIn"), buyIn: AmountSchema }).strict(),
  z.object({ type: z.literal("setCurrency"), currency: CurrencySchema }).strict(),
  z.object({ type: z.literal("addChip"), chipId: Id }).strict(),
  z.object({ type: z.literal("removeChip"), chipId: Id }).strict(),
  z.object({ type: z.literal("setChipColor"), chipId: Id, color: ChipColorSchema }).strict(),
  z.object({ type: z.literal("setChipCount"), chipId: Id, count: CountSchema }).strict(),
  z.object({ type: z.literal("setChipValue"), chipId: Id, value: AmountSchema }).strict(),
  z.object({ type: z.literal("setUniformValue"), enabled: z.boolean() }).strict(),
  z.object({ type: z.literal("setUniformChipCount"), count: CountSchema }).strict(),
  z.object({ type: z.literal("setUniformChipValue"), value: AmountSchema }).strict(),
  z.object({ type: z.literal("adjustBuyins"), playerId: Id, delta: Delta }).strict(),
  z
    .object({
      type: z.literal("setPlayerChipCount"),
      playerId: Id,
      chipId: Id,
      count: CountSchema.nullable(),
    })
    .strict(),
  z
    .object({
      type: z.literal("applyPhotoCounts"),
      playerId: Id,
      counts: z.partialRecord(ChipColorSchema, CountSchema),
    })
    .strict(),
  z.object({ type: z.literal("autoFillChips"), chipIds: z.tuple([Id, Id, Id]) }).strict(),
  z.object({ type: z.literal("setScale"), scale: z.boolean() }).strict(),
  z.object({ type: z.literal("setSpreadBy"), spreadBy: z.enum(SPREAD_BY) }).strict(),
]);
export type SharedAction = z.infer<typeof SharedActionSchema>;

/** The request body of an edit (REQ-0003-10, -14). */
export const EditEnvelopeSchema = z
  .object({
    actionId: z.uuid(),
    /** The revision the client last saw; informational, the server merges onto the current one. */
    baseRev: z.number().int().min(0),
    /** How long the client held this edit offline, so the server needs no trusted client clock. */
    queuedMs: z.number().int().min(0).max(ARCHIVE_AFTER_MS),
    action: SharedActionSchema,
  })
  .strict();
export type EditEnvelope = z.infer<typeof EditEnvelopeSchema>;

export type EditFailure = "forbidden" | "archived" | "stale" | "invalid" | "too_large";

export type EditResult =
  { ok: true; doc: StoredGame; changed: boolean } | { ok: false; reason: EditFailure };

/** Every action except `startGame` is a reducer action; this keeps the two unions in step. */
function toGameAction(action: Exclude<SharedAction, { type: "startGame" }>): GameAction {
  return action;
}

/**
 * Applies one edit to a stored game. A retried edit (known action id) succeeds without changing
 * anything. Buy-in changes are deltas, so concurrent ones add up; other edits set a value, so the
 * later one wins (REQ-0003-11). The result is checked against the same rules as a saved game.
 */
export function applyEdit(
  doc: StoredGame,
  role: Role,
  envelope: EditEnvelope,
  context: { now: number; status: LifecycleStatus },
): EditResult {
  if (role !== "edit") return { ok: false, reason: "forbidden" };
  if (context.status === "archived") return { ok: false, reason: "archived" };
  if (doc.recentActionIds.includes(envelope.actionId)) return { ok: true, doc, changed: false };
  if (envelope.queuedMs > MAX_QUEUED_MS) return { ok: false, reason: "stale" };

  const { action } = envelope;
  let started = doc.started;
  let body: unknown = doc.game;
  if (action.type === "startGame") {
    if (!doc.started) {
      if (!canStartGame({ ...doc.game, screen: "setup" })) return { ok: false, reason: "invalid" };
      started = true;
    }
  } else {
    body = omitScreen(gameReducer({ ...doc.game, screen: "setup" }, toGameAction(action)));
  }

  const parsed = SharedGameBodySchema.safeParse(body);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (byteLength(parsed.data) > MAX_GAME_BYTES) return { ok: false, reason: "too_large" };

  return {
    ok: true,
    changed: true,
    doc: {
      ...doc,
      rev: doc.rev + 1,
      updatedAt: context.now,
      started,
      game: parsed.data,
      recentActionIds: [...doc.recentActionIds, envelope.actionId].slice(-RECENT_ACTIONS),
    },
  };
}
