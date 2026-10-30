import { getGameStoreConfig } from "@/lib/infra/env";
import { createMemoryGameStore, type GameStore } from "@/lib/infra/game-store";
import { createUpstashGameStore } from "@/lib/infra/upstash-game-store";

declare global {
  var __chipLedgerMemoryStore: GameStore | undefined;
}

/**
 * The configured store, or `null` when sharing is off (REQ-0003-01, -27). The in-memory store is
 * kept on `globalThis` so development reloads and every route in one process share it.
 */
export function getGameStore(
  env: Readonly<Record<string, string | undefined>> = process.env,
): GameStore | null {
  const config = getGameStoreConfig(env);
  if (!config.enabled) return null;
  if (config.kind === "upstash") return createUpstashGameStore(config);
  globalThis.__chipLedgerMemoryStore ??= createMemoryGameStore({ namespace: config.namespace });
  return globalThis.__chipLedgerMemoryStore;
}
