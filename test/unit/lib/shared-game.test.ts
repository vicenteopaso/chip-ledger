import { describe, expect, it } from "vitest";

import { createGame } from "@/lib/game";
import { sequentialIds } from "@/lib/ids";
import {
  applyAction,
  applyEdit,
  ARCHIVE_AFTER_MS,
  CodeSchema,
  codeFromBytes,
  codeIsLive,
  CODE_ALPHABET,
  CODE_LENGTH,
  CreateGameRequestSchema,
  createStoredGame,
  EditEnvelopeSchema,
  GameIdSchema,
  GameReplySchema,
  keyFromHash,
  KeySchema,
  lastActivityAt,
  lifecycleStatus,
  MAX_GAME_BYTES,
  MAX_QUEUED_MS,
  normalizeCode,
  RECORD_TTL_SECONDS,
  SharedActionSchema,
  SharedGameBodySchema,
  StoredGameSchema,
  toSnapshot,
  type EditEnvelope,
  type SharedAction,
  type StoredGame,
} from "@/lib/shared-game";
import { defaultGame } from "@/test/unit/fixtures";

const HASH = "a".repeat(64);
const NOW = 1_800_000_000_000;

function storedGame(overrides: Partial<StoredGame> = {}): StoredGame {
  const request = CreateGameRequestSchema.parse({ started: false, game: defaultGame() });
  const doc = createStoredGame({
    id: "abcdefghijklmnop",
    request,
    watchKeyHash: HASH,
    editKeyHash: "b".repeat(64),
    now: NOW,
  });
  if (!doc) throw new Error("fixture too large");
  return { ...doc, ...overrides };
}

let counter = 0;
function envelope(action: SharedAction, extra: Partial<EditEnvelope> = {}): EditEnvelope {
  counter += 1;
  return {
    actionId: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    baseRev: 0,
    queuedMs: 0,
    action,
    ...extra,
  };
}
const ctx = { now: NOW + 1000, status: "active" as const };

describe("identifiers and keys (REQ-0003-04, -26)", () => {
  it("accepts only well-formed ids and keys", () => {
    expect(GameIdSchema.safeParse("abcdefghijklmnop").success).toBe(true);
    expect(GameIdSchema.safeParse("short").success).toBe(false);
    expect(GameIdSchema.safeParse("abcdefghijklmno!").success).toBe(false);
    expect(KeySchema.safeParse("A".repeat(22)).success).toBe(true);
    expect(KeySchema.safeParse("A".repeat(21)).success).toBe(false);
    expect(KeySchema.safeParse(`${"A".repeat(21)}=`).success).toBe(false);
  });
});

describe("lifecycle (REQ-0003-19 to -21)", () => {
  it("is archived only after 24 hours with no activity", () => {
    expect(lifecycleStatus(NOW, NOW + ARCHIVE_AFTER_MS)).toBe("active");
    expect(lifecycleStatus(NOW, NOW + ARCHIVE_AFTER_MS + 1)).toBe("archived");
  });

  it("counts the later of the last change and the last connected device", () => {
    expect(lastActivityAt(100, null)).toBe(100);
    expect(lastActivityAt(100, 500)).toBe(500);
    expect(lastActivityAt(900, 500)).toBe(900);
  });

  it("keeps records 24 hours plus 30 days", () => {
    expect(RECORD_TTL_SECONDS).toBe(31 * 24 * 60 * 60);
  });
});

describe("edit codes (REQ-0003-08, -09)", () => {
  it("builds a 6-character code from the alphabet and skips biased bytes", () => {
    // 248 is the largest multiple of 31 up to 256, so 248 and 255 are discarded.
    const code = codeFromBytes(() =>
      Uint8Array.from([0, 1, 30, 31, 255, 248, 247, 62, 61, 5, 6, 7]),
    );
    expect(code).toBe("AB9A9A");
  });

  it("has no look-alike characters and 31 symbols", () => {
    expect(CODE_ALPHABET).toHaveLength(31);
    for (const bad of "01ILO") expect(CODE_ALPHABET).not.toContain(bad);
  });

  it("asks for more bytes when a batch is mostly rejected", () => {
    let calls = 0;
    const code = codeFromBytes(() => {
      calls += 1;
      return calls === 1 ? new Uint8Array(12).fill(255) : new Uint8Array(12).fill(3);
    });
    expect(calls).toBe(2);
    expect(code).toBe((CODE_ALPHABET[3] ?? "").repeat(CODE_LENGTH));
  });

  it("normalizes typed codes", () => {
    expect(normalizeCode(" ab-c d ")).toBe("ABCD");
    expect(CodeSchema.safeParse("abc-234").data).toBe("ABC234");
    expect(CodeSchema.safeParse("ABC23").success).toBe(false);
    expect(CodeSchema.safeParse("ABCO23").success).toBe(false);
  });

  it("is live until it expires", () => {
    const code = { hash: HASH, salt: "0".repeat(16), expiresAt: NOW + 10 };
    expect(codeIsLive(code, NOW)).toBe(true);
    expect(codeIsLive(code, NOW + 10)).toBe(false);
    expect(codeIsLive(null, NOW)).toBe(false);
  });
});

describe("the shared game body (REQ-0003-15, -23)", () => {
  it("drops the step and keeps the rest", () => {
    const parsed = SharedGameBodySchema.parse({ ...defaultGame(), screen: "settle" });
    expect("screen" in parsed).toBe(false);
    expect(parsed.players).toHaveLength(10);
  });

  it("applies the saved-game rules", () => {
    expect(SharedGameBodySchema.safeParse({ ...defaultGame(), buyIn: "20" }).success).toBe(false);
    expect(SharedGameBodySchema.safeParse(null).success).toBe(false);
    expect(SharedGameBodySchema.safeParse({ ...defaultGame(), count: 11 }).success).toBe(false);
  });

  it("rejects unknown keys in create requests", () => {
    const bad = CreateGameRequestSchema.safeParse({ started: false, game: defaultGame(), x: 1 });
    expect(bad.success).toBe(false);
  });

  it("creates a stored game at revision 0 and refuses an oversized one", () => {
    const doc = storedGame();
    expect(doc.rev).toBe(0);
    expect(doc.code).toBeNull();
    expect(StoredGameSchema.safeParse(doc).success).toBe(true);
    const huge = createGame(sequentialIds("x"));
    const players = SharedGameBodySchema.parse(huge).players.map((p) => ({
      ...p,
      name: "n".repeat(200),
      counts: Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`chip-${String(i)}`, 1])),
    }));
    const oversized = createStoredGame({
      id: "abcdefghijklmnop",
      request: { started: false, game: { ...SharedGameBodySchema.parse(huge), players } },
      watchKeyHash: HASH,
      editKeyHash: HASH,
      now: NOW,
    });
    expect(oversized).toBeNull();
    expect(MAX_GAME_BYTES).toBe(32768);
  });
});

describe("what a device may send (REQ-0003-23)", () => {
  it.each([
    { type: "go", screen: "settle" },
    { type: "replace", game: {} },
    { type: "newGameSamePlayers" },
    { type: "nope" },
    { type: "setName", playerId: "p1", name: "x".repeat(201) },
    { type: "adjustBuyins", playerId: "p1", delta: 2 },
    { type: "setName", playerId: "p1", name: "Ana", extra: true },
  ])("rejects %j", (action) => {
    expect(SharedActionSchema.safeParse(action).success).toBe(false);
  });

  it("accepts every shared kind with valid fields", () => {
    const actions: SharedAction[] = [
      { type: "startGame" },
      { type: "setPlayerCount", count: 5 },
      { type: "setName", playerId: "p1", name: "Ana" },
      { type: "setBuyIn", buyIn: 25 },
      { type: "setCurrency", currency: "USD" },
      { type: "addChip", chipId: "c9" },
      { type: "removeChip", chipId: "red" },
      { type: "setChipColor", chipId: "red", color: "green" },
      { type: "setChipCount", chipId: "red", count: 4 },
      { type: "setChipValue", chipId: "red", value: 1 },
      { type: "setUniformValue", enabled: true },
      { type: "setUniformChipCount", count: 3 },
      { type: "setUniformChipValue", value: 2 },
      { type: "adjustBuyins", playerId: "p1", delta: 1 },
      { type: "setPlayerChipCount", playerId: "p1", chipId: "red", count: null },
      { type: "applyPhotoCounts", playerId: "p1", counts: { red: 3 } },
      { type: "autoFillChips", chipIds: ["a", "b", "c"] },
      { type: "setScale", scale: false },
      { type: "setSpreadBy", spreadBy: "equal" },
    ];
    for (const action of actions) expect(SharedActionSchema.safeParse(action).success).toBe(true);
  });

  it("validates the envelope", () => {
    const good = envelope({ type: "startGame" });
    expect(EditEnvelopeSchema.safeParse(good).success).toBe(true);
    expect(EditEnvelopeSchema.safeParse({ ...good, actionId: "nope" }).success).toBe(false);
    expect(EditEnvelopeSchema.safeParse({ ...good, queuedMs: -1 }).success).toBe(false);
    expect(EditEnvelopeSchema.safeParse({ ...good, extra: 1 }).success).toBe(false);
  });
});

describe("applyEdit", () => {
  it("REQ-0003-06: refuses a watcher and an archived game", () => {
    const edit = envelope({ type: "setName", playerId: "p1", name: "Ana" });
    expect(applyEdit(storedGame(), "watch", edit, ctx)).toEqual({ ok: false, reason: "forbidden" });
    expect(applyEdit(storedGame(), "edit", edit, { ...ctx, status: "archived" })).toEqual({
      ok: false,
      reason: "archived",
    });
  });

  it("REQ-0003-10: applies an edit, bumps the revision and the time", () => {
    const result = applyEdit(
      storedGame(),
      "edit",
      envelope({ type: "setName", playerId: "p1", name: "Ana" }),
      ctx,
    );
    expect(result.ok && result.doc.rev).toBe(1);
    expect(result.ok && result.doc.updatedAt).toBe(ctx.now);
    expect(result.ok && result.doc.game.players[0]?.name).toBe("Ana");
    expect(result.ok && result.changed).toBe(true);
  });

  it("REQ-0003-11: buy-in changes from two editors add up", () => {
    const first = applyEdit(
      storedGame(),
      "edit",
      envelope({ type: "adjustBuyins", playerId: "p1", delta: 1 }),
      ctx,
    );
    if (!first.ok) throw new Error("first edit failed");
    const second = applyEdit(
      first.doc,
      "edit",
      envelope({ type: "adjustBuyins", playerId: "p1", delta: 1 }),
      ctx,
    );
    expect(second.ok && second.doc.game.players[0]?.buyins).toBe(3);
  });

  it("REQ-0003-11: edits to different fields are both kept; the same field takes the later one", () => {
    let doc = storedGame();
    for (const action of [
      { type: "setName", playerId: "p1", name: "Ana" },
      { type: "setName", playerId: "p2", name: "Ben" },
      { type: "setName", playerId: "p1", name: "Ana B" },
    ] as const) {
      const result = applyEdit(doc, "edit", envelope(action), ctx);
      if (!result.ok) throw new Error("edit failed");
      doc = result.doc;
    }
    expect(doc.game.players[0]?.name).toBe("Ana B");
    expect(doc.game.players[1]?.name).toBe("Ben");
    expect(doc.rev).toBe(3);
  });

  it("applies a retried edit once", () => {
    const edit = envelope({ type: "adjustBuyins", playerId: "p1", delta: 1 });
    const first = applyEdit(storedGame(), "edit", edit, ctx);
    if (!first.ok) throw new Error("first edit failed");
    const again = applyEdit(first.doc, "edit", edit, ctx);
    expect(again).toEqual({ ok: true, doc: first.doc, changed: false });
  });

  it("remembers only the last 50 action ids", () => {
    let doc = storedGame();
    for (let i = 0; i < 52; i += 1) {
      const result = applyEdit(
        doc,
        "edit",
        envelope({ type: "adjustBuyins", playerId: "p1", delta: 1 }),
        ctx,
      );
      if (!result.ok) throw new Error("edit failed");
      doc = result.doc;
    }
    expect(doc.recentActionIds).toHaveLength(50);
  });

  it("drops an edit held offline for more than 15 minutes", () => {
    const edit = envelope({ type: "setBuyIn", buyIn: 30 }, { queuedMs: MAX_QUEUED_MS + 1 });
    expect(applyEdit(storedGame(), "edit", edit, ctx)).toEqual({ ok: false, reason: "stale" });
    const fresh = envelope({ type: "setBuyIn", buyIn: 30 }, { queuedMs: MAX_QUEUED_MS });
    expect(applyEdit(storedGame(), "edit", fresh, ctx).ok).toBe(true);
  });

  it("REQ-0003-15: starts the game once and refuses to start an empty one", () => {
    const started = applyEdit(storedGame(), "edit", envelope({ type: "startGame" }), ctx);
    expect(started.ok && started.doc.started).toBe(true);
    if (!started.ok) throw new Error("start failed");
    const again = applyEdit(started.doc, "edit", envelope({ type: "startGame" }), ctx);
    expect(again.ok && again.doc.started).toBe(true);

    const broken = storedGame({ game: { ...storedGame().game, buyIn: 0 } });
    expect(applyEdit(broken, "edit", envelope({ type: "startGame" }), ctx)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("REQ-0003-23: refuses an edit that would make the game invalid", () => {
    const huge = applyEdit(
      storedGame(),
      "edit",
      envelope({ type: "setBuyIn", buyIn: 1_000_000_000 }),
      ctx,
    );
    expect(huge.ok).toBe(true);
    const broken = applyEdit(
      storedGame({ game: { ...storedGame().game, chips: [] } }),
      "edit",
      envelope({ type: "setScale", scale: false }),
      ctx,
    );
    expect(broken).toEqual({ ok: false, reason: "invalid" });
  });

  it("REQ-0003-25: refuses an edit that makes the game too large", () => {
    const players = storedGame().game.players.map((p) => ({
      ...p,
      name: "n".repeat(200),
      counts: Object.fromEntries(Array.from({ length: 250 }, (_, i) => [`chip-${String(i)}`, 1])),
    }));
    const almost = storedGame({ game: { ...storedGame().game, players } });
    const result = applyEdit(almost, "edit", envelope({ type: "setScale", scale: false }), ctx);
    expect(result).toEqual({ ok: false, reason: "too_large" });
  });
});

describe("toSnapshot", () => {
  it("never carries hashes or codes", () => {
    const snapshot = toSnapshot(storedGame(), "watch", "archived", 3);
    expect(snapshot).toMatchObject({
      rev: 0,
      started: false,
      role: "watch",
      archived: true,
      online: 3,
    });
    expect(JSON.stringify(snapshot)).not.toContain(HASH);
    expect(Object.keys(snapshot)).not.toContain("watchKeyHash");
  });
});

describe("join links and replies (REQ-0003-04, -05)", () => {
  it("reads the key from #k= and nothing else", () => {
    const key = "A".repeat(22);
    expect(keyFromHash(`#k=${key}`)).toBe(key);
    for (const bad of ["", "#", `#${key}`, `#k=${key}x`, "#k=short", `#k=${key}&x=1`, `k=${key}`]) {
      expect(keyFromHash(bad)).toBeNull();
    }
  });

  it("parses a snapshot and the short unchanged answer, and nothing in between", () => {
    const snapshot = toSnapshot(storedGame(), "watch", "active", null);
    expect("game" in (GameReplySchema.parse(snapshot) as object)).toBe(true);
    expect(
      GameReplySchema.parse({ rev: 1, unchanged: true, archived: false, online: 2 }),
    ).toMatchObject({
      unchanged: true,
    });
    expect(
      GameReplySchema.safeParse({ rev: 1, unchanged: false, archived: false, online: 2 }).success,
    ).toBe(false);
    expect(GameReplySchema.safeParse({ ...snapshot, role: "admin" }).success).toBe(false);
  });
});

describe("applyAction (REQ-0003-10, -11, -23)", () => {
  const state = { started: false, game: SharedGameBodySchema.parse(defaultGame()) };

  it("applies a setting and leaves the original alone", () => {
    const next = applyAction(state, { type: "setName", playerId: "p1", name: "Ana" });
    expect(next?.game.players[0]?.name).toBe("Ana");
    expect(state.game.players[0]?.name).toBe("");
  });

  it("starts the game once, and refuses to start one with no buy-in", () => {
    const started = applyAction(state, { type: "startGame" });
    expect(started?.started).toBe(true);
    expect(applyAction(started ?? state, { type: "startGame" })?.started).toBe(true);
    const empty = applyAction(state, { type: "setBuyIn", buyIn: 0 });
    expect(applyAction(empty ?? state, { type: "startGame" })).toBeNull();
  });

  it("answers null for an action that would make the game invalid", () => {
    const broken = { started: true, game: { ...state.game, chips: [] } };
    expect(applyAction(broken, { type: "setScale", scale: false })).toBeNull();
  });
});
