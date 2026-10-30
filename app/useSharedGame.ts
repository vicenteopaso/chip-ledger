"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGame } from "@/lib/infra/shared-game-client";
import { type GameSnapshot, HEARTBEAT_MS } from "@/lib/shared-game";
import {
  type ConnectionStatus,
  connectionStatus,
  pollDelayMs,
  retryDelayMs,
} from "@/lib/shared-game-sync";

/** What the page knows about the shared game it opened (SPEC-0003). */
export type SharedGameView =
  | { phase: "loading"; status: ConnectionStatus }
  /** No such game with this key: stop asking (REQ-0003-26). */
  | { phase: "unavailable" }
  | {
      phase: "ready";
      snapshot: GameSnapshot;
      archived: boolean;
      /** Connected devices as of the last heartbeat, or null before the first one. */
      online: number | null;
      status: ConnectionStatus;
    };

const LOADING: SharedGameView = { phase: "loading", status: "live" };

export type SharedGameFeed = {
  view: SharedGameView;
  /**
   * Takes in a newer snapshot the caller got elsewhere, such as the answer to a saved edit. An
   * older or equal revision is ignored, and a change counts as activity, so checks speed up.
   */
  receive: (snapshot: GameSnapshot) => void;
};

/**
 * Keeps one shared game up to date by asking the server: every 2 s for a minute after a change,
 * then every 5 s; never while the tab is hidden, and once straight away when it returns. A missed
 * check backs off and shows as Reconnecting, then Offline (REQ-0003-10, -13, ADR-0005 addendum).
 * Every 45 s a check doubles as a heartbeat so the others can see this device is here.
 */
export function useSharedGame(id: string, key: string | null): SharedGameFeed {
  // The view belongs to the game and key it was fetched with: a different link for the same
  // game starts again instead of showing what the old key could see.
  const scope = `${id}:${key ?? ""}`;
  const [held, setHeld] = useState<{ scope: string; view: SharedGameView }>({
    scope,
    view: LOADING,
  });
  const view = held.scope === scope ? held.view : LOADING;
  const rev = useRef<number | undefined>(undefined);
  // Set when the checks start; reading the clock here would make a render impure.
  const lastChange = useRef(0);

  const update = useCallback(
    (next: SharedGameView | ((previous: SharedGameView) => SharedGameView)) => {
      setHeld((previous) => {
        const current = previous.scope === scope ? previous.view : LOADING;
        return { scope, view: typeof next === "function" ? next(current) : next };
      });
    },
    [scope],
  );

  const receive = useCallback(
    (snapshot: GameSnapshot) => {
      if (rev.current !== undefined && snapshot.rev <= rev.current) return;
      rev.current = snapshot.rev;
      lastChange.current = Date.now();
      update((previous) => ({
        phase: "ready",
        snapshot,
        archived: snapshot.archived,
        online: snapshot.online ?? (previous.phase === "ready" ? previous.online : null),
        status: "live",
      }));
    },
    [update],
  );

  useEffect(() => {
    if (!key) return;
    rev.current = undefined;
    lastChange.current = Date.now();
    const connection = crypto.randomUUID();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let lastBeat = 0;
    let failures = 0;

    const schedule = (delay: number) => {
      clearTimeout(timer);
      if (stopped || document.hidden) return;
      timer = setTimeout(() => {
        void check();
      }, delay);
    };

    async function check(): Promise<void> {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      const now = Date.now();
      const beat = now - lastBeat >= HEARTBEAT_MS;
      const outcome = await fetchGame({
        id,
        key: key ?? "",
        ...(rev.current === undefined ? {} : { rev: rev.current }),
        ...(beat ? { connection } : {}),
        signal: current.signal,
      });
      // A check that was cancelled (the tab was hidden, or a newer one started) is not a failure.
      if (stopped || current.signal.aborted) return;

      if (outcome.kind === "unavailable") {
        update({ phase: "unavailable" });
        return;
      }
      if (outcome.kind === "error" || outcome.kind === "busy") {
        failures += 1;
        const status = connectionStatus(failures);
        update((previous) =>
          previous.phase === "unavailable" ? previous : { ...previous, status },
        );
        schedule(retryDelayMs(failures));
        return;
      }

      failures = 0;
      if (beat) lastBeat = now;
      if (outcome.kind === "snapshot") {
        receive(outcome.snapshot);
      } else {
        update((previous) =>
          previous.phase === "ready"
            ? {
                ...previous,
                archived: outcome.archived,
                online: outcome.online ?? previous.online,
                status: "live",
              }
            : previous,
        );
      }
      schedule(pollDelayMs(lastChange.current, Date.now()));
    }

    const resume = () => {
      if (document.hidden) {
        clearTimeout(timer);
        controller?.abort();
      } else {
        void check();
      }
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    void check();

    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
    };
  }, [id, key, update, receive]);

  return { view, receive };
}
