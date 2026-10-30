import type { GameStore } from "@/lib/infra/game-store";
import { CODE_LOCKOUT_MS, CODE_MAX_FAILURES } from "@/lib/shared-game";

/**
 * Rate limits that live in the shared store, so they hold across server instances (REQ-0003-09,
 * -25). The per-instance limiter in `rate-limit.ts` stays for the photo route.
 */

export type LimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/** At most `limit` hits per `windowMs` for `name`; the window starts at the first hit. */
export async function checkLimit(
  store: GameStore,
  name: string,
  rule: { limit: number; windowMs: number },
): Promise<LimitResult> {
  const count = await store.incr(name, rule.windowMs);
  if (count <= rule.limit) return { ok: true };
  return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(rule.windowMs / 1000)) };
}

const lockName = (gameId: string) => `codelock:${gameId}`;
const failName = (gameId: string) => `codefail:${gameId}`;

/** Wrong edit codes: five in a minute lock the game's upgrade for a minute, whoever tries. */
export function createCodeGuard(store: GameStore) {
  return {
    isLocked: (gameId: string) => store.hasFlag(lockName(gameId)),
    async recordFailure(gameId: string): Promise<void> {
      const failures = await store.incr(failName(gameId), CODE_LOCKOUT_MS);
      if (failures >= CODE_MAX_FAILURES) await store.setFlag(lockName(gameId), CODE_LOCKOUT_MS);
    },
  };
}
