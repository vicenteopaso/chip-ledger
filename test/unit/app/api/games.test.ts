// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as createGame } from "@/app/api/games/route";
import { DELETE, GET } from "@/app/api/games/[id]/route";
import { POST as postAction } from "@/app/api/games/[id]/actions/route";
import { POST as postCode } from "@/app/api/games/[id]/code/route";
import { POST as postUpgrade } from "@/app/api/games/[id]/upgrade/route";
import { getGameStore } from "@/lib/infra/game-store-factory";
import { ARCHIVE_AFTER_MS, CODE_LOCKOUT_MS, CODE_TTL_MS, MAX_EDITORS } from "@/lib/shared-game";
import { defaultGame } from "@/test/unit/fixtures";

const ORIGIN = "https://chips.example";
const START = Date.parse("2026-11-01T10:00:00Z");
let client = 0;

type Options = {
  method?: string;
  key?: string;
  body?: unknown;
  rawBody?: string;
  origin?: string | null;
  ip?: string;
  headers?: Record<string, string>;
};

function call(path: string, options: Options = {}) {
  const { method = "GET", key, body, rawBody, origin = ORIGIN, headers = {} } = options;
  const ip = options.ip ?? `198.51.100.${String((client += 1))}`;
  const init: RequestInit = {
    method,
    headers: {
      "x-forwarded-for": ip,
      ...(origin ? { origin } : {}),
      ...(key ? { authorization: `Bearer ${key}` } : {}),
      ...headers,
    },
  };
  if (rawBody !== undefined) init.body = rawBody;
  else if (body !== undefined) init.body = JSON.stringify(body);
  return new Request(`${ORIGIN}${path}`, init);
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const asJson = async (response: Response) => (await response.json()) as Record<string, unknown>;

async function share(options: Options = {}) {
  const response = await createGame(
    call("/api/games", {
      method: "POST",
      body: { started: false, game: defaultGame() },
      ...options,
    }),
  );
  return { response, ...(response.status === 201 ? await readShared(response) : emptyShared) };
}
const emptyShared = { id: "", watchKey: "", editKey: "" };
async function readShared(response: Response) {
  const body = (await response.json()) as { id: string; watchKey: string; editKey: string };
  return { id: body.id, watchKey: body.watchKey, editKey: body.editKey };
}

let seq = 0;
const envelope = (action: unknown, extra: Record<string, unknown> = {}) => ({
  actionId: `00000000-0000-4000-8000-${String((seq += 1)).padStart(12, "0")}`,
  baseRev: 0,
  queuedMs: 0,
  action,
  ...extra,
});
const edit = (id: string, key: string, action: unknown, extra?: Record<string, unknown>) =>
  postAction(
    call(`/api/games/${id}/actions`, { method: "POST", key, body: envelope(action, extra) }),
    ctx(id),
  );
const nameAction = (name: string) => ({ type: "setName", playerId: "p1", name });

beforeEach(() => {
  vi.stubEnv("GAME_STORE_MEMORY", "true");
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(START);
  globalThis.__chipLedgerMemoryStore = undefined;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  globalThis.__chipLedgerMemoryStore = undefined;
});

describe("sharing is off without a store (REQ-0003-01, -27)", () => {
  it("answers 404 on every route", async () => {
    vi.stubEnv("GAME_STORE_MEMORY", "");
    const id = "abcdefghijklmnop";
    const key = "A".repeat(22);
    expect((await share()).response.status).toBe(404);
    expect((await GET(call(`/api/games/${id}`, { key }), ctx(id))).status).toBe(404);
    expect(
      (await DELETE(call(`/api/games/${id}`, { method: "DELETE", key }), ctx(id))).status,
    ).toBe(404);
    expect((await edit(id, key, nameAction("x"))).status).toBe(404);
    expect(
      (await postCode(call(`/api/games/${id}/code`, { method: "POST", key }), ctx(id))).status,
    ).toBe(404);
    expect(
      (
        await postUpgrade(
          call(`/api/games/${id}/upgrade`, { method: "POST", key, body: {} }),
          ctx(id),
        )
      ).status,
    ).toBe(404);
  });
});

describe("POST /api/games", () => {
  it("REQ-0003-01, -04: stores the game and returns the id and two keys once", async () => {
    const { response, id, watchKey, editKey } = await share();
    expect(response.status).toBe(201);
    expect(id).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(watchKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(editKey).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(watchKey).not.toBe(editKey);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("REQ-0003-24: the stored game holds hashes, never the keys", async () => {
    const { id, watchKey, editKey } = await share();
    const stored = JSON.stringify(await getGameStore()?.get(id));
    expect(stored).not.toContain(watchKey);
    expect(stored).not.toContain(editKey);
    expect(stored).toContain("watchKeyHash");
  });

  it("REQ-0003-23: refuses a cross-origin or origin-less request", async () => {
    expect((await share({ origin: "https://evil.example" })).response.status).toBe(403);
    expect((await share({ origin: null })).response.status).toBe(403);
  });

  it("REQ-0003-23: refuses a body that is not JSON, not a game, or has extra keys", async () => {
    const bad = [
      { rawBody: "not json" },
      { body: { started: false, game: { nope: true } } },
      { body: { started: false, game: defaultGame(), extra: 1 } },
      { body: { game: defaultGame() } },
    ];
    for (const options of bad) {
      const response = await createGame(call("/api/games", { method: "POST", ...options }));
      expect(response.status).toBe(400);
      expect(await asJson(response)).toMatchObject({ type: "invalid_request" });
    }
  });

  it("REQ-0003-25: refuses a body that is too large", async () => {
    const declared = await createGame(
      call("/api/games", {
        method: "POST",
        rawBody: "{}",
        headers: { "content-length": "999999" },
      }),
    );
    expect(declared.status).toBe(413);
    const real = await createGame(
      call("/api/games", { method: "POST", rawBody: " ".repeat(40_000) }),
    );
    expect(real.status).toBe(413);
  });

  it("REQ-0003-25: limits creations per client and asks to retry", async () => {
    const ip = "203.0.113.9";
    for (let i = 0; i < 10; i += 1) expect((await share({ ip })).response.status).toBe(201);
    const limited = (await share({ ip })).response;
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("3600");
    expect((await share({ ip: "203.0.113.10" })).response.status).toBe(201);
  });

  it("REQ-0003-25: a daily cap on all creations answers 503", async () => {
    for (let i = 0; i < 200; i += 1) {
      expect((await share({ ip: `192.0.2.${String(i)}` })).response.status).toBe(201);
    }
    const capped = (await share({ ip: "192.0.2.250" })).response;
    expect(capped.status).toBe(503);
    expect(await asJson(capped)).toMatchObject({ type: "unavailable" });
  });
});

describe("GET /api/games/{id}", () => {
  it("REQ-0003-26: every way of not finding a game looks the same", async () => {
    const { id, watchKey } = await share();
    const wrongKey = "B".repeat(22);
    const responses = [
      await GET(call(`/api/games/${id}`), ctx(id)),
      await GET(call(`/api/games/${id}`, { key: wrongKey }), ctx(id)),
      await GET(call(`/api/games/${id}`, { key: "short" }), ctx(id)),
      await GET(call(`/api/games/abcdefghijklmnop`, { key: watchKey }), ctx("abcdefghijklmnop")),
      await GET(call(`/api/games/bad`, { key: watchKey }), ctx("bad")),
    ];
    const bodies = await Promise.all(
      responses.map(async (r) => {
        const { type, title, status } = await asJson(r);
        return { httpStatus: r.status, type, title, status };
      }),
    );
    for (const body of bodies) expect(body).toEqual(bodies[0]);
    expect(bodies[0]?.httpStatus).toBe(404);
  });

  it("REQ-0003-05, -06: the key decides the role and the answer carries no hashes", async () => {
    const { id, watchKey, editKey } = await share();
    const watcher = await asJson(await GET(call(`/api/games/${id}`, { key: watchKey }), ctx(id)));
    const editor = await asJson(await GET(call(`/api/games/${id}`, { key: editKey }), ctx(id)));
    expect(watcher).toMatchObject({
      role: "watch",
      rev: 0,
      started: false,
      archived: false,
      online: null,
    });
    expect(editor).toMatchObject({ role: "edit" });
    expect(JSON.stringify(watcher)).not.toMatch(/KeyHash|recentActionIds|"code"/);
    expect((watcher.game as { players: unknown[] }).players).toHaveLength(10);
  });

  it("answers a short 'unchanged' when the caller already has the revision", async () => {
    const { id, watchKey } = await share();
    const same = await asJson(
      await GET(call(`/api/games/${id}?rev=0`, { key: watchKey }), ctx(id)),
    );
    expect(same).toEqual({ rev: 0, unchanged: true, archived: false, online: null });
    const other = await asJson(
      await GET(call(`/api/games/${id}?rev=7`, { key: watchKey }), ctx(id)),
    );
    expect(other).toHaveProperty("game");
  });

  it("REQ-0003-13: a connection id makes the request a heartbeat and counts devices", async () => {
    const { id, watchKey } = await share();
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    await GET(call(`/api/games/${id}?connection=${a}`, { key: watchKey }), ctx(id));
    const second = await asJson(
      await GET(call(`/api/games/${id}?connection=${b}`, { key: watchKey }), ctx(id)),
    );
    expect(second.online).toBe(2);
    const bad = await asJson(
      await GET(call(`/api/games/${id}?connection=nope`, { key: watchKey }), ctx(id)),
    );
    expect(bad.online).toBeNull();
  });

  it("REQ-0003-19, -20: archives after 24 hours idle; a connected device keeps it active", async () => {
    const quiet = await share();
    const busy = await share();
    const device = "33333333-3333-4333-8333-333333333333";
    vi.setSystemTime(START + 10 * 60 * 60 * 1000);
    await GET(
      call(`/api/games/${busy.id}?connection=${device}`, { key: busy.watchKey }),
      ctx(busy.id),
    );
    vi.setSystemTime(START + ARCHIVE_AFTER_MS + 60 * 60 * 1000);
    const idle = await asJson(
      await GET(call(`/api/games/${quiet.id}`, { key: quiet.watchKey }), ctx(quiet.id)),
    );
    const alive = await asJson(
      await GET(call(`/api/games/${busy.id}`, { key: busy.watchKey }), ctx(busy.id)),
    );
    expect(idle.archived).toBe(true);
    expect(alive.archived).toBe(false);
  });

  it("REQ-0003-20: opening an archived game does not count as activity", async () => {
    const { id, watchKey } = await share();
    vi.setSystemTime(START + ARCHIVE_AFTER_MS + 1000);
    const device = "44444444-4444-4444-8444-444444444444";
    const first = await asJson(
      await GET(call(`/api/games/${id}?connection=${device}`, { key: watchKey }), ctx(id)),
    );
    expect(first).toMatchObject({ archived: true, online: null });
    expect(await getGameStore()?.seenAt(id)).toBeNull();
    const again = await asJson(
      await GET(call(`/api/games/${id}?rev=0`, { key: watchKey }), ctx(id)),
    );
    expect(again).toMatchObject({ unchanged: true, archived: true });
  });

  it("REQ-0003-25: a cheap in-process limit on reads", async () => {
    const { id, watchKey } = await share();
    const ip = "198.18.0.1";
    for (let i = 0; i < 120; i += 1) {
      expect(
        (await GET(call(`/api/games/${id}?rev=0`, { key: watchKey, ip }), ctx(id))).status,
      ).toBe(200);
    }
    const limited = await GET(call(`/api/games/${id}`, { key: watchKey, ip }), ctx(id));
    expect(limited.status).toBe(429);
  });
});

describe("DELETE /api/games/{id}", () => {
  it("REQ-0003-21: an editor deletes the game for everyone; a watcher cannot", async () => {
    const { id, watchKey, editKey } = await share();
    const del = (key: string, origin: string | null = ORIGIN) =>
      DELETE(call(`/api/games/${id}`, { method: "DELETE", key, origin }), ctx(id));
    expect((await del(watchKey)).status).toBe(403);
    expect((await del(editKey, "https://evil.example")).status).toBe(403);
    expect((await del(editKey)).status).toBe(204);
    expect((await GET(call(`/api/games/${id}`, { key: editKey }), ctx(id))).status).toBe(404);
    expect(await getGameStore()?.get(id)).toBeNull();
  });
});

describe("POST /api/games/{id}/actions", () => {
  it("REQ-0003-06: a watcher cannot edit and the game stays as it was", async () => {
    const { id, watchKey, editKey } = await share();
    expect((await edit(id, watchKey, nameAction("Ana"))).status).toBe(403);
    const game = await asJson(await GET(call(`/api/games/${id}`, { key: editKey }), ctx(id)));
    expect(game.rev).toBe(0);
  });

  it("REQ-0003-10: an editor's change is saved and seen by a watcher", async () => {
    const { id, watchKey, editKey } = await share();
    const response = await edit(id, editKey, nameAction("Ana"));
    expect(response.status).toBe(200);
    expect(await asJson(response)).toMatchObject({ rev: 1, role: "edit" });
    const seen = (await asJson(
      await GET(call(`/api/games/${id}`, { key: watchKey }), ctx(id)),
    )) as {
      game: { players: { name: string }[] };
    };
    expect(seen.game.players[0]?.name).toBe("Ana");
  });

  it("REQ-0003-11: buy-ins from two editors add up and a retried edit counts once", async () => {
    const { id, watchKey, editKey } = await share();
    const plus = { type: "adjustBuyins", playerId: "p1", delta: 1 };
    await edit(id, editKey, plus);
    const retried = envelope(plus);
    const once = await postAction(
      call(`/api/games/${id}/actions`, { method: "POST", key: editKey, body: retried }),
      ctx(id),
    );
    const twice = await postAction(
      call(`/api/games/${id}/actions`, { method: "POST", key: editKey, body: retried }),
      ctx(id),
    );
    expect((await asJson(once)).rev).toBe(2);
    expect((await asJson(twice)).rev).toBe(2);
    const seen = (await asJson(
      await GET(call(`/api/games/${id}`, { key: watchKey }), ctx(id)),
    )) as {
      game: { players: { buyins: number }[] };
    };
    expect(seen.game.players[0]?.buyins).toBe(3);
  });

  it("REQ-0003-23: refuses bad bodies, unknown kinds, and cross-origin calls", async () => {
    const { id, editKey } = await share();
    const post = (options: Options) =>
      postAction(
        call(`/api/games/${id}/actions`, { method: "POST", key: editKey, ...options }),
        ctx(id),
      );
    expect((await post({ rawBody: "nope" })).status).toBe(400);
    expect((await post({ body: envelope({ type: "replace", game: {} }) })).status).toBe(400);
    expect((await post({ body: envelope({ type: "go", screen: "settle" }) })).status).toBe(400);
    expect((await post({ body: { actionId: "x" } })).status).toBe(400);
    expect(
      (await post({ origin: "https://evil.example", body: envelope(nameAction("x")) })).status,
    ).toBe(403);
  });

  it("REQ-0003-25: refuses a body that is too large", async () => {
    const { id, editKey } = await share();
    const response = await postAction(
      call(`/api/games/${id}/actions`, { method: "POST", key: editKey, rawBody: " ".repeat(9000) }),
      ctx(id),
    );
    expect(response.status).toBe(413);
  });

  it("REQ-0003-15, -23: starts a game once, and refuses to start one with no buy-in", async () => {
    const ready = await share();
    expect(await asJson(await edit(ready.id, ready.editKey, { type: "startGame" }))).toMatchObject({
      started: true,
    });
    const empty = await share();
    await edit(empty.id, empty.editKey, { type: "setBuyIn", buyIn: 0 });
    const refused = await edit(empty.id, empty.editKey, { type: "startGame" });
    expect(refused.status).toBe(400);
    expect(await asJson(refused)).toMatchObject({ type: "invalid_request" });
  });

  it("drops an edit that was held offline for more than 15 minutes", async () => {
    const { id, editKey } = await share();
    const response = await edit(id, editKey, nameAction("late"), { queuedMs: 16 * 60 * 1000 });
    expect(response.status).toBe(409);
    expect(await asJson(response)).toMatchObject({ type: "stale" });
  });

  it("REQ-0003-20: an archived game is read-only", async () => {
    const { id, editKey } = await share();
    vi.setSystemTime(START + ARCHIVE_AFTER_MS + 1000);
    const response = await edit(id, editKey, nameAction("x"));
    expect(response.status).toBe(409);
    expect(await asJson(response)).toMatchObject({ type: "game_archived" });
  });

  it("REQ-0003-25: limits edits per game", async () => {
    const { id, editKey } = await share();
    for (let i = 0; i < 240; i += 1) {
      expect((await edit(id, editKey, nameAction(`n${String(i)}`))).status).toBe(200);
    }
    expect((await edit(id, editKey, nameAction("one too many"))).status).toBe(429);
  });

  it("REQ-0003-10: re-reads and tries again when somebody saved in between", async () => {
    const { id, editKey } = await share();
    const store = getGameStore();
    if (!store) throw new Error("no store");
    const cas = vi
      .spyOn(store, "compareAndSet")
      .mockImplementationOnce(() => Promise.resolve(false));
    const response = await edit(id, editKey, nameAction("Ana"));
    expect(response.status).toBe(200);
    expect(cas).toHaveBeenCalledTimes(2);
  });

  it("answers 409 after three lost races, and 404 if the game vanished meanwhile", async () => {
    const { id, editKey } = await share();
    const store = getGameStore();
    if (!store) throw new Error("no store");
    vi.spyOn(store, "compareAndSet").mockResolvedValue(false);
    const lost = await edit(id, editKey, nameAction("a"));
    expect(lost.status).toBe(409);
    expect(await asJson(lost)).toMatchObject({ type: "conflict" });

    vi.restoreAllMocks();
    const second = await share();
    const again = getGameStore();
    if (!again) throw new Error("no store");
    vi.spyOn(again, "compareAndSet").mockResolvedValue(false);
    const realGet = again.get.bind(again);
    let reads = 0;
    vi.spyOn(again, "get").mockImplementation((gameId) => {
      reads += 1;
      return reads === 1 ? realGet(gameId) : Promise.resolve(null);
    });
    expect((await edit(second.id, second.editKey, nameAction("b"))).status).toBe(404);
  });
});

describe("edit codes and upgrades", () => {
  const code = (id: string, key: string) =>
    postCode(call(`/api/games/${id}/code`, { method: "POST", key }), ctx(id));
  const upgrade = (id: string, key: string, body: unknown, ip?: string) =>
    postUpgrade(
      call(`/api/games/${id}/upgrade`, { method: "POST", key, body, ...(ip ? { ip } : {}) }),
      ctx(id),
    );

  it("REQ-0003-08: only an editor can show a code, and the game keeps only a hash", async () => {
    const { id, watchKey, editKey } = await share();
    expect((await code(id, watchKey)).status).toBe(403);
    const response = await code(id, editKey);
    const body = (await asJson(response)) as { code: string; expiresAt: number };
    expect(response.status).toBe(200);
    expect(body.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/);
    expect(body.expiresAt).toBe(START + CODE_TTL_MS);
    expect(JSON.stringify(await getGameStore()?.get(id))).not.toContain(body.code);
  });

  it("REQ-0003-09: a watcher who enters the code gets their own edit key; other editors keep theirs", async () => {
    const { id, watchKey, editKey } = await share();
    const { code: shown } = (await asJson(await code(id, editKey))) as { code: string };
    const response = await upgrade(id, watchKey, {
      code: shown.toLowerCase().replace(/^(...)/, "$1-"),
    });
    expect(response.status).toBe(200);
    const { editKey: newKey } = (await asJson(response)) as { editKey: string };
    expect(newKey).not.toBe(editKey);
    expect((await edit(id, newKey, nameAction("Ben"))).status).toBe(200);
    expect((await edit(id, editKey, nameAction("Ana"))).status).toBe(200);
    // The same code still works for a second watcher until it expires or is replaced.
    expect((await upgrade(id, watchKey, { code: shown })).status).toBe(200);
  });

  it("REQ-0003-08: a replaced code, an expired code, and a wrong code all fail the same way", async () => {
    const { id, watchKey, editKey } = await share();
    const first = ((await asJson(await code(id, editKey))) as { code: string }).code;
    const second = ((await asJson(await code(id, editKey))) as { code: string }).code;
    const replaced = await upgrade(id, watchKey, { code: first });
    expect(replaced.status).toBe(403);
    const wrong = await upgrade(id, watchKey, { code: second === "AAAAAA" ? "BBBBBB" : "AAAAAA" });
    expect(wrong.status).toBe(403);
    expect(await asJson(wrong)).toMatchObject({
      type: "invalid_code",
      title: "That code didn't work.",
    });
    vi.setSystemTime(START + CODE_TTL_MS + 1000);
    const expired = await upgrade(id, watchKey, { code: second });
    expect(expired.status).toBe(403);
    expect(await asJson(expired)).toMatchObject({
      type: "invalid_code",
      title: "That code didn't work.",
    });
  });

  it("REQ-0003-09: a game with no code refuses every upgrade", async () => {
    const { id, watchKey } = await share();
    expect((await upgrade(id, watchKey, { code: "ABCDEF" })).status).toBe(403);
  });

  it("REQ-0003-23: a malformed code is a 400 and does not count toward the lockout", async () => {
    const { id, watchKey, editKey } = await share();
    const { code: shown } = (await asJson(await code(id, editKey))) as { code: string };
    for (const body of [{}, { code: "12" }, { code: "ABCDE0" }, { code: shown, extra: 1 }, "x"]) {
      expect((await upgrade(id, watchKey, body)).status).toBe(400);
    }
    const bad = await postUpgrade(
      call(`/api/games/${id}/upgrade`, { method: "POST", key: watchKey, rawBody: "nope" }),
      ctx(id),
    );
    expect(bad.status).toBe(400);
    const huge = await postUpgrade(
      call(`/api/games/${id}/upgrade`, {
        method: "POST",
        key: watchKey,
        rawBody: "x".repeat(2000),
      }),
      ctx(id),
    );
    expect(huge.status).toBe(413);
    expect((await upgrade(id, watchKey, { code: shown })).status).toBe(200);
  });

  it("REQ-0003-09: five wrong codes lock upgrades for everyone for a minute", async () => {
    const { id, watchKey, editKey } = await share();
    const { code: shown } = (await asJson(await code(id, editKey))) as { code: string };
    const wrong = shown === "AAAAAA" ? "BBBBBB" : "AAAAAA";
    for (let i = 0; i < 5; i += 1) {
      expect(
        (await upgrade(id, watchKey, { code: wrong }, `203.0.113.${String(i + 20)}`)).status,
      ).toBe(403);
    }
    const locked = await upgrade(id, watchKey, { code: shown }, "203.0.113.99");
    expect(locked.status).toBe(429);
    expect(locked.headers.get("retry-after")).toBe("60");
    vi.setSystemTime(START + CODE_LOCKOUT_MS + 1000);
    expect((await upgrade(id, watchKey, { code: shown })).status).toBe(200);
  });

  it("a game holds at most 20 editors", async () => {
    const { id, watchKey, editKey } = await share();
    const { code: shown } = (await asJson(await code(id, editKey))) as { code: string };
    for (let i = 1; i < MAX_EDITORS; i += 1) {
      expect((await upgrade(id, watchKey, { code: shown })).status).toBe(200);
    }
    const full = await upgrade(id, watchKey, { code: shown });
    expect(full.status).toBe(409);
    expect(await asJson(full)).toMatchObject({ type: "editor_limit" });
  });

  it("REQ-0003-25: limits codes per game", async () => {
    const { id, editKey } = await share();
    for (let i = 0; i < 20; i += 1) expect((await code(id, editKey)).status).toBe(200);
    expect((await code(id, editKey)).status).toBe(429);
  });

  it("REQ-0003-23: refuses cross-origin calls", async () => {
    const { id, watchKey, editKey } = await share();
    const evil = "https://evil.example";
    expect(
      (
        await postCode(
          call(`/api/games/${id}/code`, { method: "POST", key: editKey, origin: evil }),
          ctx(id),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await postUpgrade(
          call(`/api/games/${id}/upgrade`, {
            method: "POST",
            key: watchKey,
            body: {},
            origin: evil,
          }),
          ctx(id),
        )
      ).status,
    ).toBe(403);
  });

  it("answers 409 after lost races and 404 when the game vanished meanwhile", async () => {
    const { id, watchKey, editKey } = await share();
    const store = getGameStore();
    if (!store) throw new Error("no store");
    const { code: shown } = (await asJson(await code(id, editKey))) as { code: string };
    vi.spyOn(store, "compareAndSet").mockResolvedValue(false);
    expect((await code(id, editKey)).status).toBe(409);
    expect((await upgrade(id, watchKey, { code: shown })).status).toBe(409);

    const realGet = store.get.bind(store);
    let reads = 0;
    vi.spyOn(store, "get").mockImplementation((gameId) => {
      reads += 1;
      return reads === 1 ? realGet(gameId) : Promise.resolve(null);
    });
    expect((await code(id, editKey)).status).toBe(404);
    reads = 0;
    expect((await upgrade(id, watchKey, { code: shown })).status).toBe(404);
  });
});

describe("logs (REQ-0003-24)", () => {
  it("never contain a key, an edit code, or the store token, even when requests fail", async () => {
    const lines: string[] = [];
    const record = (...args: unknown[]) => lines.push(args.map(String).join(" "));
    vi.spyOn(console, "error").mockImplementation(record);
    vi.spyOn(console, "warn").mockImplementation(record);

    const { id, watchKey, editKey } = await share();
    const { code: shown } = (await asJson(
      await postCode(call(`/api/games/${id}/code`, { method: "POST", key: editKey }), ctx(id)),
    )) as { code: string };

    vi.stubEnv("GAME_STORE_MEMORY", "");
    vi.stubEnv("KV_REST_API_URL", "https://redis.example");
    vi.stubEnv("KV_REST_API_TOKEN", "very-secret-store-token");
    vi.stubGlobal("fetch", () => Promise.reject(new Error("network down")));
    await GET(call(`/api/games/${id}`, { key: watchKey }), ctx(id));
    await edit(id, editKey, nameAction("x"));
    await postUpgrade(
      call(`/api/games/${id}/upgrade`, { method: "POST", key: watchKey, body: { code: shown } }),
      ctx(id),
    );

    expect(lines.length).toBeGreaterThan(0);
    for (const secret of [watchKey, editKey, shown, "very-secret-store-token"]) {
      expect(lines.join("\n")).not.toContain(secret);
    }
  });
});

describe("store failures (REQ-0003-25)", () => {
  function brokenStore(response: () => Promise<Response>) {
    vi.stubEnv("GAME_STORE_MEMORY", "");
    vi.stubEnv("KV_REST_API_URL", "https://redis.example");
    vi.stubEnv("KV_REST_API_TOKEN", "token");
    vi.stubGlobal("fetch", response);
  }

  it("answers a generic 503 when the store is unavailable, such as over quota", async () => {
    brokenStore(() => Promise.resolve(new Response("limit exceeded", { status: 429 })));
    const response = (await share()).response;
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
    const body = await asJson(response);
    expect(body).toMatchObject({ type: "unavailable" });
    expect(JSON.stringify(body)).not.toMatch(/limit exceeded|token|redis/i);
  });

  it("answers a generic 500 for anything else that goes wrong", async () => {
    brokenStore(() => Promise.resolve(new Response("not json", { status: 200 })));
    const response = (await share()).response;
    expect(response.status).toBe(500);
    expect(await asJson(response)).toMatchObject({ type: "failed" });
  });

  it("does the same on the other routes", async () => {
    const id = "abcdefghijklmnop";
    const key = "A".repeat(22);
    brokenStore(() => Promise.reject(new Error("network")));
    expect((await GET(call(`/api/games/${id}`, { key }), ctx(id))).status).toBe(503);
    expect(
      (await DELETE(call(`/api/games/${id}`, { method: "DELETE", key }), ctx(id))).status,
    ).toBe(503);
    expect((await edit(id, key, nameAction("x"))).status).toBe(503);
    expect(
      (await postCode(call(`/api/games/${id}/code`, { method: "POST", key }), ctx(id))).status,
    ).toBe(503);
    expect(
      (
        await postUpgrade(
          call(`/api/games/${id}/upgrade`, { method: "POST", key, body: {} }),
          ctx(id),
        )
      ).status,
    ).toBe(503);
  });
});
