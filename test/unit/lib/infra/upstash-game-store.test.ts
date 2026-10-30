import { describe, expect, it, vi } from "vitest";

import { createUpstashGameStore } from "@/lib/infra/upstash-game-store";
import { gameDoc } from "@/test/unit/lib/infra/game-store-contract";

type Call = { url: string; init: RequestInit; body: unknown };

function fakeFetch(replies: unknown[], status = 200) {
  const calls: Call[] = [];
  const impl = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    const text = typeof init?.body === "string" ? init.body : "null";
    calls.push({
      url: typeof url === "string" ? url : "",
      init: init ?? {},
      body: JSON.parse(text),
    });
    const reply = replies.shift();
    return Promise.resolve(new Response(JSON.stringify(reply), { status }));
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const options = (fetchImpl: typeof fetch) => ({
  url: "https://redis.example",
  token: "secret-token",
  namespace: "preview",
  fetch: fetchImpl,
});

describe("Upstash game store", () => {
  it("ADR-0005: sends the token as a bearer header and prefixes every key", async () => {
    const { impl, calls } = fakeFetch([
      { result: "OK" },
      { result: null },
      { result: 1 },
      { result: 0 },
      { result: null },
      { result: 2 },
      { result: 1 },
      { result: "OK" },
      { result: 1 },
    ]);
    const store = createUpstashGameStore(options(impl));
    const doc = gameDoc();
    await store.create(doc);
    await store.get(doc.id);
    await store.compareAndSet(doc, 4);
    await store.heartbeat(doc.id, "device", 1000);
    await store.seenAt(doc.id);
    await store.onlineCount(doc.id, 1000);
    await store.remove(doc.id);
    await store.setFlag("lock", 5000);
    await store.hasFlag("lock");

    for (const call of calls) {
      expect(call.url).toBe("https://redis.example");
      expect((call.init.headers as Record<string, string>).Authorization).toBe(
        "Bearer secret-token",
      );
    }
    const commands = calls.map((call) => call.body as (string | number)[]);
    expect(commands[0]?.slice(0, 2)).toEqual(["SET", `preview:game:${doc.id}`]);
    expect(commands[0]?.slice(3)).toEqual(["EX", 31 * 24 * 60 * 60, "NX"]);
    expect(commands[2]?.[0]).toBe("EVAL");
    expect(commands[2]?.slice(2, 5)).toEqual([1, `preview:game:${doc.id}`, 4]);
    expect(commands[3]?.slice(2, 5)).toEqual([
      3,
      `preview:game:${doc.id}`,
      `preview:seen:${doc.id}`,
    ]);
    expect(commands[6]).toEqual([
      "DEL",
      `preview:game:${doc.id}`,
      `preview:seen:${doc.id}`,
      `preview:online:${doc.id}`,
    ]);
    expect(commands[7]).toEqual(["SET", "preview:flag:lock", "1", "PX", 5000]);
    expect(commands[8]).toEqual(["EXISTS", "preview:flag:lock"]);
    // No command is a bulk delete (ADR-0005).
    expect(commands.flat().some((part) => /^(FLUSHALL|FLUSHDB|KEYS)$/i.test(String(part)))).toBe(
      false,
    );
  });

  it("reads results: create, compare-and-set, seenAt, online count, flags", async () => {
    const doc = gameDoc();
    const { impl } = fakeFetch([
      { result: "OK" },
      { result: null },
      { result: 1 },
      { result: 0 },
      { result: "12345" },
      { result: null },
      { result: 3 },
      { result: null },
      { result: 1 },
      { result: 0 },
      { result: JSON.stringify(doc) },
      { result: null },
    ]);
    const store = createUpstashGameStore(options(impl));
    expect(await store.create(doc)).toBe(true);
    expect(await store.create(doc)).toBe(false);
    expect(await store.compareAndSet(doc, 0)).toBe(true);
    expect(await store.compareAndSet(doc, 0)).toBe(false);
    expect(await store.seenAt(doc.id)).toBe(12345);
    expect(await store.seenAt(doc.id)).toBeNull();
    expect(await store.onlineCount(doc.id, 1)).toBe(3);
    expect(await store.onlineCount(doc.id, 1)).toBe(0);
    expect(await store.hasFlag("f")).toBe(true);
    expect(await store.hasFlag("f")).toBe(false);
    expect(await store.get(doc.id)).toEqual(doc);
    expect(await store.get(doc.id)).toBeNull();
  });

  it("counts with a pipeline that sets the window only on first use", async () => {
    const { impl, calls } = fakeFetch([
      [{ result: 1 }, { result: 1 }],
      [{ result: "x" }, { result: 0 }],
    ]);
    const store = createUpstashGameStore(options(impl));
    expect(await store.incr("limit", 60_000)).toBe(1);
    expect(await store.incr("limit", 60_000)).toBe(0);
    expect(calls[0]?.url).toBe("https://redis.example/pipeline");
    expect(calls[0]?.body).toEqual([
      ["INCR", "preview:count:limit"],
      ["PEXPIRE", "preview:count:limit", 60_000, "NX"],
    ]);
  });

  it("fails with a generic error that never contains the token or the reply", async () => {
    const secret = "very-secret-detail";
    const failures = [
      fakeFetch([{ error: secret }]).impl,
      fakeFetch([{}], 500).impl,
      vi.fn(() => Promise.reject(new Error(secret))) as unknown as typeof fetch,
    ];
    for (const impl of failures) {
      const store = createUpstashGameStore(options(impl));
      const error = await store.get("abcdefghijklmnop").catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("Game store request failed.");
      expect((error as Error).message).not.toContain("secret");
    }
  });

  it("uses the global fetch when none is given", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ result: null })));
    await createUpstashGameStore({ url: "https://r.example", token: "t", namespace: "x" }).get("a");
    expect(spy).toHaveBeenCalledOnce();
  });
});
