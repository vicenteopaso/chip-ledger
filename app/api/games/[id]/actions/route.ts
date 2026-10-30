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
  statusOf,
  storeOrNull,
  tooLarge,
  tooManyRequests,
} from "@/app/api/games/_lib";
import { checkLimit } from "@/lib/infra/store-rate-limit";
import { applyEdit, EditEnvelopeSchema, type EditFailure, toSnapshot } from "@/lib/shared-game";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const MAX_BODY_BYTES = 8 * 1024;
const EDITS_PER_GAME = { limit: 240, windowMs: 60 * 1000 };
const ATTEMPTS = 3;

const FAILURES: Record<EditFailure, (requestId: string) => Response> = {
  forbidden,
  archived: (id) => problem(409, "game_archived", "This game is archived.", id),
  stale: (id) => problem(409, "stale", "That change is too old to apply.", id),
  invalid: invalidRequest,
  too_large: tooLarge,
};

/**
 * Applies one edit (REQ-0003-06, -07, -10, -11). The server runs the same reducer as the browser,
 * checks the result with the saved-game rules, and saves it only if nobody saved in between;
 * if somebody did, it re-reads and applies the edit again.
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const store = storeOrNull();
    if (!store) return problem(404, "not_found", "Not found.");
    if (!originAllowed(request)) return forbidden(requestId);

    const opened = await openGame(request, (await params).id, store, requestId);
    if (!opened.ok) return opened.response;
    const { role } = opened.opened;
    if (role !== "edit") return forbidden(requestId);

    const body = await readJson(request, MAX_BODY_BYTES);
    if (!body.ok) return body.tooLarge ? tooLarge(requestId) : invalidRequest(requestId);
    const envelope = EditEnvelopeSchema.safeParse(body.value);
    if (!envelope.success) return invalidRequest(requestId);

    const limited = await checkLimit(store, `edit:${opened.opened.doc.id}`, EDITS_PER_GAME);
    if (!limited.ok) return tooManyRequests(requestId, limited.retryAfterSeconds);

    let doc = opened.opened.doc;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      const now = Date.now();
      const status = await statusOf(store, doc, now);
      const result = applyEdit(doc, role, envelope.data, { now, status });
      if (!result.ok) return FAILURES[result.reason](requestId);
      if (!result.changed || (await store.compareAndSet(result.doc, doc.rev))) {
        return json(toSnapshot(result.doc, role, status, null));
      }
      const latest = await store.get(doc.id);
      if (!latest) return notFound(requestId);
      doc = latest;
    }
    return problem(409, "conflict", "The game changed. Please try again.", requestId);
  } catch (error) {
    return failed(error, "POST /api/games/[id]/actions", requestId);
  }
}
