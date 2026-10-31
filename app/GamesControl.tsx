"use client";

import { useMemo, useState } from "react";

import { type GameRow, GamesSheet } from "@/app/components/GamesSheet";
import { gameTitle } from "@/lib/games-list";
import { loadSavedGame } from "@/lib/infra/game-storage";
import { forgetGame, listGames } from "@/lib/infra/joined-games-storage";
import { deleteSharedGame } from "@/lib/infra/shared-game-client";
import type { Role } from "@/lib/shared-game";

export type GamesControlProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The shared game on screen, with the key this device holds; `null` on this device's own game. */
  current: { id: string; key: string; role: Role } | null;
  /** The title of this device's own game; read from storage when not given. */
  ownTitle?: string | null;
  /** Where to go; the browser's own navigation by default. */
  navigate?: (url: string) => void;
};

const goTo = (url: string) => {
  window.location.assign(url);
};

const DELETE_PROBLEMS = {
  forbidden: "Only someone who can edit this game can delete it.",
  error: "The game couldn't be deleted. Check your connection and try again.",
} as const;

/**
 * Everything behind the Games button (SPEC-0003 REQ-0003-17, -21): the list of games on this
 * device, opening one, leaving one (this device only), and deleting the open game for everyone.
 * Each game keeps the step this device was last on (REQ-0003-18), so opening it picks up there.
 */
export function GamesControl({
  open,
  onOpenChange,
  current,
  ownTitle,
  navigate = goTo,
}: GamesControlProps) {
  const [wasOpen, setWasOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Each time the sheet opens it shows the list as it is now, with no question asked.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setVersion((n) => n + 1);
      setLeaving(null);
      setConfirming(false);
      setProblem(null);
    }
  }

  const rows = useMemo<GameRow[]>(
    () =>
      open
        ? listGames().map((game) => ({
            id: game.id,
            title: game.title ?? "Shared game",
            role: game.role ?? null,
            current: game.id === current?.id,
          }))
        : [],
    // `version` makes the list read again after a game is left.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, version, current?.id],
  );
  const own = useMemo(() => {
    if (!open) return null;
    if (ownTitle !== undefined) return ownTitle;
    const saved = loadSavedGame();
    return saved ? gameTitle(saved) : null;
  }, [open, ownTitle]);

  const leave = (id: string) => {
    forgetGame(id);
    if (id === current?.id) {
      navigate("/");
      return;
    }
    setLeaving(null);
    setVersion((n) => n + 1);
  };

  const remove = async () => {
    if (!current) return;
    const outcome = await deleteSharedGame({ id: current.id, key: current.key });
    if (outcome.kind === "deleted") {
      forgetGame(current.id);
      navigate("/");
      return;
    }
    setConfirming(false);
    setProblem(DELETE_PROBLEMS[outcome.kind]);
  };

  return (
    <GamesSheet
      open={open}
      onClose={() => {
        onOpenChange(false);
      }}
      games={rows}
      ownGame={own === null ? null : { title: own, current: current === null }}
      onOpenGame={(id) => {
        navigate(`/g/${id}`);
      }}
      onOpenOwn={() => {
        navigate("/");
      }}
      leaving={leaving}
      onLeavingChange={setLeaving}
      onLeave={leave}
      {...(current?.role === "edit"
        ? {
            remove: {
              confirming,
              onConfirmingChange: setConfirming,
              onConfirm: () => {
                void remove();
              },
              problem,
            },
          }
        : {})}
    />
  );
}
