import {
  failed,
  forbidden,
  json,
  notFound,
  openGame,
  originAllowed,
  problem,
  storeOrNull,
  tooManyRequests,
} from "@/app/api/games/_lib";
import { issueEditCode } from "@/lib/infra/secrets";
import { checkLimit } from "@/lib/infra/store-rate-limit";
import { withCode } from "@/lib/shared-game";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const CODES_PER_GAME = { limit: 20, windowMs: 10 * 60 * 1000 };
const ATTEMPTS = 3;

/**
 * Shows a new edit code, which ends the previous one (REQ-0003-08). Editors only. The plain code
 * is in this answer and nowhere else; the game keeps only a salted hash.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const store = storeOrNull();
    if (!store) return problem(404, "not_found", "Not found.");
    if (!originAllowed(request)) return forbidden(requestId);

    const opened = await openGame(request, (await params).id, store, requestId);
    if (!opened.ok) return opened.response;
    if (opened.opened.role !== "edit") return forbidden(requestId);

    const limited = await checkLimit(store, `code:${opened.opened.doc.id}`, CODES_PER_GAME);
    if (!limited.ok) return tooManyRequests(requestId, limited.retryAfterSeconds);

    let doc = opened.opened.doc;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const now = Date.now();
      const { code, stored } = issueEditCode(now);
      if (await store.compareAndSet(withCode(doc, stored, now), doc.rev)) {
        return json({ code, expiresAt: stored.expiresAt });
      }
      const latest = await store.get(doc.id);
      if (!latest) return notFound(requestId);
      doc = latest;
    }
    return problem(409, "conflict", "The game changed. Please try again.", requestId);
  } catch (error) {
    return failed(error, "POST /api/games/[id]/code", requestId);
  }
}
