import { problemBody } from "@/lib/api-problem";
import { logError } from "@/lib/error-logging";
import { GAME_STORE_ERROR, type GameStore } from "@/lib/infra/game-store";
import { getGameStore } from "@/lib/infra/game-store-factory";
import { createRateLimiter } from "@/lib/infra/rate-limit";
import { roleForKey } from "@/lib/infra/secrets";
import { clientKey, isSameOrigin } from "@/lib/request-guards";
import {
  ARCHIVE_AFTER_MS,
  GameIdSchema,
  KeySchema,
  lastActivityAt,
  lifecycleStatus,
  type LifecycleStatus,
  type Role,
  type StoredGame,
} from "@/lib/shared-game";

/**
 * Shared steps for the shared-game routes (SPEC-0003, docs/API_PATTERNS.md §1): the problem body,
 * the same-origin and bearer-key checks, and how a game's lifecycle is read. Every failure to find
 * or open a game looks the same, so nobody can tell an unknown id from a wrong key (REQ-0003-26).
 */

const NO_STORE = { "Cache-Control": "no-store" };

export function problem(
  status: number,
  type: string,
  title: string,
  requestId?: string,
  headers?: Record<string, string>,
): Response {
  return Response.json(problemBody(status, type, title, requestId), {
    status,
    headers: { ...NO_STORE, ...headers },
  });
}

export const json = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: NO_STORE });

export const notFound = (requestId?: string) =>
  problem(404, "not_found", "This game isn't available.", requestId);

export const forbidden = (requestId: string) =>
  problem(403, "forbidden", "This request is not allowed.", requestId);

export const tooManyRequests = (requestId: string, retryAfterSeconds: number) =>
  problem(429, "rate_limited", "Too many requests.", requestId, {
    "Retry-After": String(retryAfterSeconds),
  });

export const invalidRequest = (requestId: string) =>
  problem(400, "invalid_request", "The request was not valid.", requestId);

export const tooLarge = (requestId: string) =>
  problem(413, "too_large", "The request was too large.", requestId);

/** A failed store request (for example the monthly quota) is "unavailable", not a bug (REQ-0003-25). */
export function failed(error: unknown, context: string, requestId: string): Response {
  logError(error, { context, requestId });
  if (error instanceof Error && error.message === GAME_STORE_ERROR) {
    return problem(
      503,
      "unavailable",
      "Sharing is unavailable right now. Your game on this device is not affected.",
      requestId,
      { "Retry-After": "60" },
    );
  }
  return problem(500, "failed", "Something went wrong. Please try again.", requestId);
}

/** The configured store, or `null` while sharing is off (the routes then answer 404). */
export const storeOrNull = (): GameStore | null => getGameStore();

export const originAllowed = (request: Request): boolean =>
  isSameOrigin(request.headers.get("origin"), request.url);

export const clientOf = (request: Request): string =>
  clientKey(request.headers.get("x-forwarded-for"));

/** Reads in one process: a cheap guard with no store commands behind it. */
const readLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });
export const readAllowed = (request: Request): boolean => readLimiter.check(clientOf(request)).ok;

export type OpenedGame = { doc: StoredGame; role: Role };

/**
 * Finds a game and what the presented key lets the caller do. A missing or malformed id or key,
 * an unknown or deleted game, and a wrong key all return the same 404.
 */
export async function openGame(
  request: Request,
  rawId: string,
  store: GameStore,
  requestId: string,
): Promise<{ ok: true; opened: OpenedGame } | { ok: false; response: Response }> {
  const miss = { ok: false, response: notFound(requestId) } as const;
  const id = GameIdSchema.safeParse(rawId);
  const header = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "");
  const key = KeySchema.safeParse(header?.[1]);
  if (!id.success || !key.success) return miss;
  const doc = await store.get(id.data);
  if (!doc) return miss;
  const role = roleForKey(key.data, doc);
  return role ? { ok: true, opened: { doc, role } } : miss;
}

/**
 * Archived after 24 hours with no change and no connected device. The last connected time is read
 * only for a game whose last change is already old, which keeps the common case at one command.
 */
export async function statusOf(
  store: GameStore,
  doc: StoredGame,
  now: number,
): Promise<LifecycleStatus> {
  if (now - doc.updatedAt <= ARCHIVE_AFTER_MS) return "active";
  return lifecycleStatus(lastActivityAt(doc.updatedAt, await store.seenAt(doc.id)), now);
}

/** Reads a JSON body of at most `limit` bytes, or `null` when it is too large or not JSON. */
export async function readJson(
  request: Request,
  limit: number,
): Promise<{ ok: true; value: unknown } | { ok: false; tooLarge: boolean }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > limit) return { ok: false, tooLarge: true };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > limit) return { ok: false, tooLarge: true };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    // Not JSON: invalid input, answered with a 400 by the caller.
    return { ok: false, tooLarge: false };
  }
}
