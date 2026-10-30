import {
  clientOf,
  failed,
  forbidden,
  invalidRequest,
  json,
  originAllowed,
  problem,
  readJson,
  storeOrNull,
  tooLarge,
  tooManyRequests,
} from "@/app/api/games/_lib";
import { hashKey, newGameId, newKey } from "@/lib/infra/secrets";
import { checkLimit } from "@/lib/infra/store-rate-limit";
import { CreateGameRequestSchema, createStoredGame, MAX_GAME_BYTES } from "@/lib/shared-game";

export const dynamic = "force-dynamic";

/** Per client and per day, so one visitor or a script cannot fill the store (REQ-0003-25). */
const CREATE_PER_CLIENT = { limit: 10, windowMs: 60 * 60 * 1000 };
const CREATE_PER_DAY = { limit: 200, windowMs: 24 * 60 * 60 * 1000 };
const MAX_BODY_BYTES = MAX_GAME_BYTES + 4096;

/** Shares a game: stores it and returns the id with its watch key and edit key (REQ-0003-01). */
export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const store = storeOrNull();
    if (!store) return problem(404, "not_found", "Not found.");
    if (!originAllowed(request)) return forbidden(requestId);

    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.tooLarge ? tooLarge(requestId) : invalidRequest(requestId);

    const perClient = await checkLimit(store, `create:${clientOf(request)}`, CREATE_PER_CLIENT);
    if (!perClient.ok) return tooManyRequests(requestId, perClient.retryAfterSeconds);
    const perDay = await checkLimit(
      store,
      `create-day:${new Date().toISOString().slice(0, 10)}`,
      CREATE_PER_DAY,
    );
    if (!perDay.ok) {
      return problem(503, "unavailable", "Sharing is busy. Please try again later.", requestId, {
        "Retry-After": String(perDay.retryAfterSeconds),
      });
    }

    const parsed = CreateGameRequestSchema.safeParse(body.value);
    if (!parsed.success) return invalidRequest(requestId);

    const watchKey = newKey();
    const editKey = newKey();
    // A clash of two random 96-bit ids is not expected; retry rather than fail if it happens.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const doc = createStoredGame({
        id: newGameId(),
        request: parsed.data,
        watchKeyHash: hashKey(watchKey),
        editKeyHash: hashKey(editKey),
        now: Date.now(),
      });
      if (!doc) return tooLarge(requestId);
      if (await store.create(doc))
        return json({ id: doc.id, watchKey, editKey, rev: doc.rev }, 201);
    }
    return problem(500, "failed", "Something went wrong. Please try again.", requestId);
  } catch (error) {
    return failed(error, "POST /api/games", requestId);
  }
}
