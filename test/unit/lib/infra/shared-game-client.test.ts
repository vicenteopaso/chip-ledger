import { describe, expect, it, vi } from "vitest";

import {
  createSharedGame,
  deleteSharedGame,
  fetchGame,
  requestEditCode,
  sendEdit,
  upgradeWithCode,
} from "@/lib/infra/shared-game-client";
import { SharedGameBodySchema } from "@/lib/shared-game";
import { defaultGame } from "@/test/unit/fixtures";

const KEY = "A".repeat(22);
const snapshot = {
  rev: 3,
  started: true,
  game: SharedGameBodySchema.parse(defaultGame()),
  role: "watch",
  archived: false,
  online: null,
};

function sender(body: unknown, status = 200) {
  return vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe("fetchGame (REQ-0003-04, -05, -10)", () => {
  it("asks with the key in a header, never in the address", async () => {
    const send = sender(snapshot);
    await fetchGame({ id: "abcdefghijklmnop", key: KEY, rev: 2, connection: "c1" }, send);
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/games/abcdefghijklmnop?rev=2&connection=c1");
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(init.cache).toBe("no-store");
  });

  it("leaves the query off when there is nothing to ask", async () => {
    const send = sender(snapshot);
    await fetchGame({ id: "abcdefghijklmnop", key: KEY }, send);
    expect((send.mock.calls[0] as unknown as [string])[0]).toBe("/api/games/abcdefghijklmnop");
  });

  it("returns a parsed snapshot", async () => {
    const outcome = await fetchGame({ id: "abcdefghijklmnop", key: KEY }, sender(snapshot));
    expect(outcome.kind).toBe("snapshot");
    expect(outcome.kind === "snapshot" && outcome.snapshot.rev).toBe(3);
  });

  it("returns the short 'unchanged' answer", async () => {
    const outcome = await fetchGame(
      { id: "abcdefghijklmnop", key: KEY, rev: 3 },
      sender({ rev: 3, unchanged: true, archived: true, online: 2 }),
    );
    expect(outcome).toEqual({ kind: "unchanged", rev: 3, archived: true, online: 2 });
  });

  it("REQ-0003-26: a 404 is one outcome, whatever the cause", async () => {
    const outcome = await fetchGame(
      { id: "abcdefghijklmnop", key: KEY },
      sender({ type: "not_found" }, 404),
    );
    expect(outcome).toEqual({ kind: "unavailable" });
  });

  it("REQ-0003-25: 429 and 503 mean slow down", async () => {
    for (const status of [429, 503]) {
      const outcome = await fetchGame({ id: "abcdefghijklmnop", key: KEY }, sender({}, status));
      expect(outcome).toEqual({ kind: "busy" });
    }
  });

  it("treats other failures, a dead network, and a bad reply as errors", async () => {
    const options = { id: "abcdefghijklmnop", key: KEY };
    expect(await fetchGame(options, sender({}, 500))).toEqual({ kind: "error" });
    expect(await fetchGame(options, () => Promise.reject(new Error("offline")))).toEqual({
      kind: "error",
    });
    expect(await fetchGame(options, () => Promise.resolve(new Response("not json")))).toEqual({
      kind: "error",
    });
    expect(await fetchGame(options, sender({ rev: "x" }))).toEqual({ kind: "error" });
    expect(await fetchGame(options, sender({ ...snapshot, game: { nope: true } }))).toEqual({
      kind: "error",
    });
  });
});

describe("sendEdit (REQ-0003-10, -14, -23)", () => {
  const envelope = {
    actionId: "00000000-0000-4000-8000-000000000001",
    baseRev: 2,
    queuedMs: 0,
    action: { type: "setName" as const, playerId: "p1", name: "Ana" },
  };
  const options = { id: "abcdefghijklmnop", key: KEY, envelope };

  it("posts the envelope with the key in a header, never in the address", async () => {
    const send = sender(snapshot);
    await sendEdit(options, send);
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/games/abcdefghijklmnop/actions");
    expect(url).not.toContain(KEY);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body as string)).toEqual(envelope);
  });

  it("returns the saved game", async () => {
    const outcome = await sendEdit(options, sender(snapshot));
    expect(outcome.kind).toBe("saved");
    expect(outcome.kind === "saved" && outcome.snapshot.rev).toBe(3);
  });

  it("drops an edit the server will never accept, with the reason", async () => {
    const reasons: [number, string, string][] = [
      [403, "forbidden", "forbidden"],
      [409, "game_archived", "archived"],
      [409, "stale", "stale"],
      [400, "invalid_request", "invalid"],
      [413, "too_large", "too_large"],
      [400, "something_new", "invalid"],
    ];
    for (const [status, type, reason] of reasons) {
      expect(await sendEdit(options, sender({ type }, status))).toEqual({
        kind: "rejected",
        reason,
      });
    }
    const unreadable = await sendEdit(options, () =>
      Promise.resolve(new Response("x", { status: 400 })),
    );
    expect(unreadable).toEqual({ kind: "rejected", reason: "invalid" });
  });

  it("keeps the edit when the problem is the network, a busy server, or a lost race", async () => {
    expect(await sendEdit(options, sender({ type: "conflict" }, 409))).toEqual({ kind: "retry" });
    for (const status of [429, 500, 502, 503]) {
      expect(await sendEdit(options, sender({}, status))).toEqual({ kind: "retry" });
    }
    expect(await sendEdit(options, () => Promise.reject(new Error("offline")))).toEqual({
      kind: "retry",
    });
    expect(await sendEdit(options, () => Promise.resolve(new Response("nope")))).toEqual({
      kind: "retry",
    });
    expect(await sendEdit(options, sender({ rev: "x" }))).toEqual({ kind: "retry" });
  });

  it("REQ-0003-26: a 404 means the game is gone", async () => {
    expect(await sendEdit(options, sender({ type: "not_found" }, 404))).toEqual({
      kind: "unavailable",
    });
  });
});

describe("sharing calls (SPEC-0003 REQ-0003-01, -08, -09)", () => {
  const request = { started: true, game: SharedGameBodySchema.parse(defaultGame()) };
  const created = {
    id: "abcdefghijklmnop",
    watchKey: "W".repeat(22),
    editKey: "E".repeat(22),
    rev: 1,
  };

  it("createSharedGame posts the game and returns the id with both keys", async () => {
    const send = sender(created, 201);
    expect(await createSharedGame(request, send)).toEqual({
      kind: "created",
      id: created.id,
      watchKey: created.watchKey,
      editKey: created.editKey,
    });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/games");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(JSON.parse(JSON.stringify(request)));
  });

  it.each([
    [404, "off"],
    [429, "busy"],
    [503, "busy"],
    [500, "error"],
  ])("createSharedGame maps %i to %s", async (status, kind) => {
    expect((await createSharedGame(request, sender({}, status))).kind).toBe(kind);
  });

  it("createSharedGame treats a bad reply or no network as an error", async () => {
    expect((await createSharedGame(request, sender({ id: 1 }, 201))).kind).toBe("error");
    const offline = vi.fn(() => Promise.reject(new TypeError("offline")));
    expect((await createSharedGame(request, offline)).kind).toBe("error");
  });

  it("requestEditCode sends the key in a header and returns the code", async () => {
    const send = sender({ code: "ABC234", expiresAt: 1234 });
    expect(await requestEditCode({ id: created.id, key: KEY }, send)).toEqual({
      kind: "issued",
      code: "ABC234",
      expiresAt: 1234,
    });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/games/${created.id}/code`);
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
  });

  it.each([
    [404, "unavailable"],
    [429, "busy"],
    [403, "error"],
  ])("requestEditCode maps %i to %s", async (status, kind) => {
    expect((await requestEditCode({ id: created.id, key: KEY }, sender({}, status))).kind).toBe(
      kind,
    );
  });

  it("requestEditCode rejects a malformed code in the reply", async () => {
    const send = sender({ code: "nope", expiresAt: 1 });
    expect((await requestEditCode({ id: created.id, key: KEY }, send)).kind).toBe("error");
  });

  it("upgradeWithCode sends the code and returns the new edit key", async () => {
    const send = sender({ editKey: "N".repeat(22) });
    expect(await upgradeWithCode({ id: created.id, key: KEY, code: "ABC234" }, send)).toEqual({
      kind: "upgraded",
      editKey: "N".repeat(22),
    });
    const [, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ code: "ABC234" });
  });

  it.each([
    [403, "refused"],
    [400, "refused"],
    [404, "refused"],
    [429, "locked"],
    [500, "error"],
  ])(
    "upgradeWithCode maps %i to %s (a wrong, old and replaced code look the same)",
    async (status, kind) => {
      const outcome = await upgradeWithCode(
        { id: created.id, key: KEY, code: "ABC234" },
        sender({}, status),
      );
      expect(outcome.kind).toBe(kind);
    },
  );

  it("upgradeWithCode reports an error for a bad reply or no network", async () => {
    expect(
      (await upgradeWithCode({ id: created.id, key: KEY, code: "ABC234" }, sender({}))).kind,
    ).toBe("error");
    const offline = vi.fn(() => Promise.reject(new TypeError("offline")));
    expect(
      (await upgradeWithCode({ id: created.id, key: KEY, code: "ABC234" }, offline)).kind,
    ).toBe("error");
  });
});

describe("deleteSharedGame (SPEC-0003 REQ-0003-21)", () => {
  const empty = (status: number) => vi.fn(() => Promise.resolve(new Response(null, { status })));

  it("deletes with the key in a header, never in the address", async () => {
    const send = empty(204);
    expect(await deleteSharedGame({ id: "abcdefghijklmnop", key: KEY }, send)).toEqual({
      kind: "deleted",
    });
    const [url, init] = send.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/games/abcdefghijklmnop");
    expect(init.method).toBe("DELETE");
    expect(url).not.toContain(KEY);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
  });

  it("counts a game that is already gone as deleted", async () => {
    expect((await deleteSharedGame({ id: "abcdefghijklmnop", key: KEY }, empty(404))).kind).toBe(
      "deleted",
    );
  });

  it("says when only an editor may do it, and when it did not work", async () => {
    expect((await deleteSharedGame({ id: "abcdefghijklmnop", key: KEY }, empty(403))).kind).toBe(
      "forbidden",
    );
    expect((await deleteSharedGame({ id: "abcdefghijklmnop", key: KEY }, empty(500))).kind).toBe(
      "error",
    );
    const offline = vi.fn(() => Promise.reject(new TypeError("offline")));
    expect((await deleteSharedGame({ id: "abcdefghijklmnop", key: KEY }, offline)).kind).toBe(
      "error",
    );
  });
});
