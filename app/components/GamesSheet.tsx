"use client";

import { Button } from "@/app/components/Button";
import { ConfirmInline } from "@/app/components/ConfirmInline";
import { Dialog } from "@/app/components/Dialog";
import { Card } from "@/app/components/Surfaces";
import { Hint } from "@/app/components/Typography";

export type GameRow = {
  id: string;
  /** What the game is called here: its players' names. */
  title: string;
  /** What this device can do in it, when it is known. */
  role: "watch" | "edit" | null;
  /** The game on screen now. */
  current: boolean;
};

export type GamesSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The shared games this device has joined or created, newest first. */
  games: readonly GameRow[];
  /** This device's own private game, when there is one. */
  ownGame: { title: string; current: boolean } | null;
  onOpenGame: (id: string) => void;
  onOpenOwn: () => void;
  /** The game being asked about leaving, or `null`. */
  leaving: string | null;
  onLeavingChange: (id: string | null) => void;
  onLeave: (id: string) => void;
  /** Present only for an editor of the game on screen: delete it for everyone (REQ-0003-21). */
  remove?: {
    confirming: boolean;
    onConfirmingChange: (open: boolean) => void;
    onConfirm: () => void;
    problem: string | null;
  };
};

const ROLE_TEXT = { watch: "Watch only", edit: "Can edit" } as const;

/**
 * The Games sheet (SPEC-0003 REQ-0003-17): the shared games this device has joined or created, and
 * its own private game, with a way to open each and to leave a shared one. Leaving only removes the
 * game from this device; it stays for everyone else. An editor can also delete the open game for
 * everyone, after a question that says so.
 */
export function GamesSheet(props: GamesSheetProps) {
  const { open, onClose, games, ownGame, leaving } = props;
  const empty = games.length === 0 && ownGame === null;
  return (
    <Dialog open={open} onClose={onClose} title="Games">
      <p className="mb-4 text-md text-text-muted">
        The games on this device. Leaving a shared game only takes it off this device; it stays for
        everyone else, and you can open it again from its link.
      </p>
      {empty && (
        <Hint>Nothing here yet. A game you share, or join from a link, will be listed.</Hint>
      )}
      <ul className="flex flex-col gap-3">
        {ownGame && (
          <Card as="li">
            <b className="block text-lg">{ownGame.title}</b>
            <span className="block text-md text-text-muted">
              {ownGame.current ? "This device's own game. Open now." : "This device's own game"}
            </span>
            {!ownGame.current && (
              <div className="mt-2">
                <Button
                  variant="secondary"
                  aria-label={`Open ${ownGame.title}`}
                  onClick={props.onOpenOwn}
                >
                  Open
                </Button>
              </div>
            )}
          </Card>
        )}
        {games.map((game) => (
          <Card as="li" key={game.id}>
            <b className="block text-lg">{game.title}</b>
            <span className="block text-md text-text-muted">
              {[game.role ? ROLE_TEXT[game.role] : null, game.current ? "Open now" : null]
                .filter(Boolean)
                .join(" · ") || "Shared game"}
            </span>
            {leaving === game.id ? (
              <div className="mt-2">
                <p className="mb-2 text-md">
                  Leave this game on this device? It stays for everyone else.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    ref={(button) => button?.focus()}
                    onClick={() => {
                      props.onLeavingChange(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    aria-label={`Leave ${game.title}`}
                    onClick={() => {
                      props.onLeave(game.id);
                    }}
                  >
                    Leave
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2 flex gap-3">
                {!game.current && (
                  <Button
                    variant="secondary"
                    aria-label={`Open ${game.title}`}
                    onClick={() => {
                      props.onOpenGame(game.id);
                    }}
                  >
                    Open
                  </Button>
                )}
                <Button
                  variant="link"
                  aria-label={`Leave ${game.title}`}
                  onClick={() => {
                    props.onLeavingChange(game.id);
                  }}
                >
                  Leave
                </Button>
              </div>
            )}
          </Card>
        ))}
      </ul>
      {props.remove && (
        <section className="mt-6 border-t border-border pt-4">
          <h3 className="mb-1 font-semibold">Delete the game on screen</h3>
          <p className="mb-3 text-md text-text-muted">
            Only editors can. It removes the game, its names and counts, from the server for
            everyone.
          </p>
          {props.remove.problem && (
            <p role="alert" className="mb-3 text-md font-semibold text-danger">
              {props.remove.problem}
            </p>
          )}
          <ConfirmInline
            triggerLabel="Delete for everyone"
            message="Delete this game for everyone? Its names and counts are removed from the server and nobody can open it again."
            confirmLabel="Delete the game"
            open={props.remove.confirming}
            onOpenChange={props.remove.onConfirmingChange}
            onConfirm={props.remove.onConfirm}
          />
        </section>
      )}
    </Dialog>
  );
}
