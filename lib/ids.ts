import type { IdFactory } from "@/lib/game";

/** Short random ids for players and chip rows. Uniqueness only matters within one game. */
export const randomId: IdFactory = () => Math.random().toString(36).slice(2, 9);

/**
 * Deterministic ids for the default game, so the server render and the first client render
 * produce identical markup.
 */
export function sequentialIds(prefix: string): IdFactory {
  let next = 0;
  return () => `${prefix}${String((next += 1))}`;
}
