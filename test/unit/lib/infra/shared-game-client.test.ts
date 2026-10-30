import { describe, expect, it, vi } from "vitest";

import { fetchGame } from "@/lib/infra/shared-game-client";
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
