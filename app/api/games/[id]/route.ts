import { z } from "zod";

import {
  failed,
  forbidden,
  json,
  openGame,
  originAllowed,
  readAllowed,
  statusOf,
  storeOrNull,
  tooManyRequests,
} from "@/app/api/games/_lib";
import { problem } from "@/app/api/games/_lib";
import { toSnapshot } from "@/lib/shared-game";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const ConnectionSchema = z.uuid();

/**
 * The game as this key sees it (REQ-0003-05, -13). Polling clients pass `rev` and get a short
 * "unchanged" answer when nothing moved. With `connection` the request is also a heartbeat and
 * returns how many devices are connected; clients send that every 45 s, not on every poll.
 */
export async function GET(request: Request, { params }: Context): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const store = storeOrNull();
    if (!store) return problem(404, "not_found", "Not found.");
    if (!readAllowed(request)) return tooManyRequests(requestId, 60);

    const opened = await openGame(request, (await params).id, store, requestId);
    if (!opened.ok) return opened.response;
    const { doc, role } = opened.opened;
    const now = Date.now();
    const status = await statusOf(store, doc, now);

    // An archived game stays read-only: opening it must not count as activity (REQ-0003-20).
    const search = new URL(request.url).searchParams;
    const connection = ConnectionSchema.safeParse(search.get("connection"));
    let online: number | null = null;
    if (connection.success && status === "active") {
      await store.heartbeat(doc.id, connection.data, now);
      online = await store.onlineCount(doc.id, now);
    }

    if (search.get("rev") === String(doc.rev)) {
      return json({ rev: doc.rev, unchanged: true, archived: status === "archived", online });
    }
    return json(toSnapshot(doc, role, status, online));
  } catch (error) {
    return failed(error, "GET /api/games/[id]", requestId);
  }
}

/** Deletes the game for everyone (REQ-0003-21). Editors only. */
export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const store = storeOrNull();
    if (!store) return problem(404, "not_found", "Not found.");
    if (!originAllowed(request)) return forbidden(requestId);

    const opened = await openGame(request, (await params).id, store, requestId);
    if (!opened.ok) return opened.response;
    if (opened.opened.role !== "edit") return forbidden(requestId);

    await store.remove(opened.opened.doc.id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failed(error, "DELETE /api/games/[id]", requestId);
  }
}
