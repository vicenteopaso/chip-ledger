import { z } from "zod";

import {
  failed,
  forbidden,
  invalidRequest,
  json,
  notFound,
  openGame,
  originAllowed,
  problem,
  readJson,
  storeOrNull,
  tooLarge,
  tooManyRequests,
} from "@/app/api/games/_lib";
import { codeMatches, hashKey, newKey } from "@/lib/infra/secrets";
import { createCodeGuard } from "@/lib/infra/store-rate-limit";
import { CODE_LOCKOUT_MS, CodeSchema, withEditor } from "@/lib/shared-game";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const BodySchema = z.object({ code: CodeSchema }).strict();
const MAX_BODY_BYTES = 1024;
const ATTEMPTS = 3;

/**
 * Turns a watcher into an editor with the current edit code (REQ-0003-09). The device gets its own
 * new edit key, so other editors keep theirs. A wrong, expired, or replaced code all answer the
 * same way, and five wrong ones lock the game's upgrades for a minute for everybody.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const store = storeOrNull();
    if (!store) return problem(404, "not_found", "Not found.");
    if (!originAllowed(request)) return forbidden(requestId);

    const opened = await openGame(request, (await params).id, store, requestId);
    if (!opened.ok) return opened.response;

    const guard = createCodeGuard(store);
    const gameId = opened.opened.doc.id;
    if (await guard.isLocked(gameId)) return tooManyRequests(requestId, CODE_LOCKOUT_MS / 1000);

    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.tooLarge ? tooLarge(requestId) : invalidRequest(requestId);
    const parsed = BodySchema.safeParse(body.value);
    if (!parsed.success) return invalidRequest(requestId);

    let doc = opened.opened.doc;
    const editKey = newKey();
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const now = Date.now();
      if (!codeMatches(parsed.data.code, doc.code, now)) {
        await guard.recordFailure(gameId);
        return problem(403, "invalid_code", "That code didn't work.", requestId);
      }
      const next = withEditor(doc, hashKey(editKey), now);
      if (!next)
        return problem(
          409,
          "editor_limit",
          "This game has the most editors it can have.",
          requestId,
        );
      if (await store.compareAndSet(next, doc.rev)) return json({ editKey });
      const latest = await store.get(gameId);
      if (!latest) return notFound(requestId);
      doc = latest;
    }
    return problem(409, "conflict", "The game changed. Please try again.", requestId);
  } catch (error) {
    return failed(error, "POST /api/games/[id]/upgrade", requestId);
  }
}
