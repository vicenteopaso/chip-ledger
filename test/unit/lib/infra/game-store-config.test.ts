import { afterEach, describe, expect, it } from "vitest";

import { getGameStoreConfig } from "@/lib/infra/env";
import { getGameStore } from "@/lib/infra/game-store-factory";

describe("getGameStoreConfig (REQ-0003-01, -27)", () => {
  it("is off with no variables", () => {
    expect(getGameStoreConfig({})).toEqual({ enabled: false });
    expect(getGameStoreConfig({ VERCEL_ENV: "production" })).toEqual({ enabled: false });
  });

  it("uses Upstash when both REST variables are set, and strips a trailing slash", () => {
    expect(
      getGameStoreConfig({
        KV_REST_API_URL: "https://r.example/",
        KV_REST_API_TOKEN: "t",
        VERCEL_ENV: "preview",
      }),
    ).toEqual({
      enabled: true,
      kind: "upstash",
      url: "https://r.example",
      token: "t",
      namespace: "preview",
    });
  });

  it("ADR-0005: the key namespace is the Vercel environment, or local", () => {
    const vars = { KV_REST_API_URL: "https://r.example", KV_REST_API_TOKEN: "t" };
    expect(getGameStoreConfig(vars)).toMatchObject({ namespace: "local" });
    expect(getGameStoreConfig({ ...vars, VERCEL_ENV: "production" })).toMatchObject({
      namespace: "production",
    });
    expect(getGameStoreConfig({ ...vars, VERCEL_ENV: "staging-2" })).toMatchObject({
      namespace: "staging-2",
    });
    expect(() => getGameStoreConfig({ ...vars, VERCEL_ENV: "Bad Env!" })).toThrow(
      "VERCEL_ENV must be a lowercase slug.",
    );
  });

  it("names the missing variable, never a value", () => {
    expect(() => getGameStoreConfig({ KV_REST_API_URL: "https://r.example" })).toThrow(
      "KV_REST_API_TOKEN is required when KV_REST_API_URL is set.",
    );
    expect(() => getGameStoreConfig({ KV_REST_API_TOKEN: "secret" })).toThrow(
      "KV_REST_API_URL is required when KV_REST_API_TOKEN is set.",
    );
    expect(() =>
      getGameStoreConfig({ KV_REST_API_URL: "ftp://x", KV_REST_API_TOKEN: "secret" }),
    ).toThrow("KV_REST_API_URL must be an http(s) URL.");
  });

  it("allows the in-memory store off Vercel only", () => {
    expect(getGameStoreConfig({ GAME_STORE_MEMORY: "true" })).toEqual({
      enabled: true,
      kind: "memory",
      namespace: "local",
    });
    expect(getGameStoreConfig({ GAME_STORE_MEMORY: "yes" })).toEqual({ enabled: false });
    expect(() =>
      getGameStoreConfig({ GAME_STORE_MEMORY: "true", VERCEL_ENV: "production" }),
    ).toThrow("GAME_STORE_MEMORY is not allowed on Vercel.");
  });

  it("prefers Upstash when both are set", () => {
    expect(
      getGameStoreConfig({
        GAME_STORE_MEMORY: "true",
        KV_REST_API_URL: "https://r.example",
        KV_REST_API_TOKEN: "t",
      }),
    ).toMatchObject({ kind: "upstash" });
  });
});

describe("getGameStore", () => {
  afterEach(() => {
    globalThis.__chipLedgerMemoryStore = undefined;
  });

  it("returns null when sharing is off", () => {
    expect(getGameStore({})).toBeNull();
  });

  it("returns one shared in-memory store per process", () => {
    const first = getGameStore({ GAME_STORE_MEMORY: "true" });
    expect(first).not.toBeNull();
    expect(getGameStore({ GAME_STORE_MEMORY: "true" })).toBe(first);
  });

  it("returns the Redis store when configured", () => {
    const store = getGameStore({ KV_REST_API_URL: "https://r.example", KV_REST_API_TOKEN: "t" });
    expect(store).not.toBeNull();
    expect(store).not.toBe(globalThis.__chipLedgerMemoryStore);
  });
});
