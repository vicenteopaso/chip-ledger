"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SharedGameView } from "@/app/useSharedGame";
import { sendEdit } from "@/lib/infra/shared-game-client";
import type { EditFailure, GameSnapshot, SharedAction } from "@/lib/shared-game";
import { enqueue, type PendingEdit, project, toEnvelope } from "@/lib/shared-game-queue";
import { type ConnectionStatus, connectionStatus, retryDelayMs } from "@/lib/shared-game-sync";

const REJECTED: Record<EditFailure, string> = {
  forbidden: "You no longer have edit access, so that change wasn't saved.",
  archived: "This game is archived, so that change wasn't saved.",
  stale: "That change waited too long offline, so it wasn't saved.",
  invalid: "That change wasn't valid, so it wasn't saved.",
  too_large: "The game is too large to save that change.",
};

export type SharedEditor = {
  /** The view with the device's own unconfirmed edits applied, so a change shows at once. */
  view: SharedGameView;
  /** Records a change: it shows now and is sent in the background, in order (REQ-0003-10). */
  send: (action: SharedAction) => void;
  /** Edits not yet confirmed by the server. */
  pending: number;
  /** Why the last change could not be saved, or null (REQ-0003-23). */
  rejected: string | null;
  dismissRejected: () => void;
};

type Options = {
  id: string;
  key: string | null;
  feed: { view: SharedGameView; receive: (snapshot: GameSnapshot) => void };
  /** A fresh action id; injectable so tests need not be random. */
  newId?: () => string;
};

/** Module-level so the default never changes between renders. */
const randomActionId = () => crypto.randomUUID();

const worst = (a: ConnectionStatus, b: ConnectionStatus): ConnectionStatus => {
  const order: ConnectionStatus[] = ["live", "reconnecting", "offline"];
  return order[Math.max(order.indexOf(a), order.indexOf(b))] ?? "live";
};

/**
 * Edits for a shared game (SPEC-0003 REQ-0003-10, -11, -14). A change is applied on this device
 * at once, then sent one at a time, in order. An edit that cannot be sent (offline, busy) is kept
 * and retried with a growing delay; one the server will never accept is dropped with a reason.
 * The same action id is reused on a retry, so the server applies it once.
 */
export function useSharedEditor({ id, key, feed, newId = randomActionId }: Options): SharedEditor {
  const scope = `${id}:${key ?? ""}`;
  const [queue, setQueue] = useState<{ scope: string; edits: PendingEdit[] }>({
    scope,
    edits: [],
  });
  const pending = useMemo(
    () => (queue.scope === scope ? queue.edits : []),
    [queue.scope, queue.edits, scope],
  );
  const [failures, setFailures] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [rejected, setRejected] = useState<string | null>(null);
  const sendingId = useRef<string | null>(null);
  const receive = feed.receive;
  const serverRev = feed.view.phase === "ready" ? feed.view.snapshot.rev : 0;
  const revRef = useRef(0);
  useEffect(() => {
    revRef.current = serverRev;
  }, [serverRev]);
  const headId = pending[0]?.actionId ?? null;

  const send = useCallback(
    (action: SharedAction) => {
      const edit: PendingEdit = { actionId: newId(), action, queuedAt: Date.now() };
      setQueue((previous) => ({
        scope,
        edits: enqueue(previous.scope === scope ? previous.edits : [], edit, sendingId.current),
      }));
    },
    [newId, scope],
  );

  // Send the oldest edit; when it is confirmed the next becomes the head and this runs again.
  useEffect(() => {
    if (!key || headId === null || sendingId.current !== null) return;
    const head = pending[0];
    if (!head) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    sendingId.current = head.actionId;
    void (async () => {
      const outcome = await sendEdit({
        id,
        key,
        envelope: toEnvelope(head, revRef.current, Date.now()),
        signal: controller.signal,
      });
      sendingId.current = null;
      if (controller.signal.aborted) return;
      const drop = () => {
        setQueue((previous) => ({
          scope,
          edits: previous.edits.filter((edit) => edit.actionId !== head.actionId),
        }));
      };
      if (outcome.kind === "saved") {
        setFailures(0);
        setRejected(null);
        receive(outcome.snapshot);
        drop();
      } else if (outcome.kind === "rejected") {
        setFailures(0);
        setRejected(REJECTED[outcome.reason]);
        drop();
      } else if (outcome.kind === "unavailable") {
        setQueue({ scope, edits: [] });
      } else {
        const next = failures + 1;
        setFailures(next);
        timer = setTimeout(() => {
          setNonce((value) => value + 1);
        }, retryDelayMs(next));
      }
    })();
    return () => {
      clearTimeout(timer);
      controller.abort();
      sendingId.current = null;
    };
    // `failures` is read when a send fails; it must not restart a send that is on its way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headId, nonce, id, key, receive, scope]);

  const view = useMemo((): SharedGameView => {
    if (feed.view.phase !== "ready") return feed.view;
    const base = { started: feed.view.snapshot.started, game: feed.view.snapshot.game };
    const shown = project(base, pending);
    return {
      ...feed.view,
      snapshot: { ...feed.view.snapshot, started: shown.started, game: shown.game },
      status: worst(feed.view.status, connectionStatus(failures)),
    };
  }, [feed.view, pending, failures]);

  const dismissRejected = useCallback(() => {
    setRejected(null);
  }, []);

  return { view, send, pending: pending.length, rejected, dismissRejected };
}
