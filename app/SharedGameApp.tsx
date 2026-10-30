"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActionBar } from "@/app/components/ActionBar";
import { AppHeader } from "@/app/components/AppHeader";
import { Button } from "@/app/components/Button";
import { CashOutScreen } from "@/app/components/CashOutScreen";
import { ConnectionStatus } from "@/app/components/ConnectionStatus";
import { GameUnavailable } from "@/app/components/GameUnavailable";
import { LiveAnnouncer } from "@/app/components/LiveAnnouncer";
import { ReadOnlyContext } from "@/app/components/ReadOnly";
import { type CopyState, SettleScreen } from "@/app/components/SettleScreen";
import { SetupScreen } from "@/app/components/SetupScreen";
import { StepsNav } from "@/app/components/StepsNav";
import { TableScreen } from "@/app/components/TableScreen";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { StepTitleContext } from "@/app/components/Typography";
import { Notice } from "@/app/components/Notice";
import { WaitingForHost } from "@/app/components/WaitingForHost";
import { WatchNotice } from "@/app/components/WatchNotice";
import { useSharedEditor } from "@/app/useSharedEditor";
import { useSharedGame } from "@/app/useSharedGame";
import { canStartGame, type GameState, type Screen, STEP_TITLES } from "@/lib/game";
import type { GameAction } from "@/lib/game-reducer";
import { randomId } from "@/lib/ids";
import { remoteChanges } from "@/lib/announcements";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { keyFor, rememberKey } from "@/lib/infra/joined-games-storage";
import { applyTheme, loadTheme, saveTheme } from "@/lib/infra/theme-storage";
import { moneyFormatter } from "@/lib/money";
import { SITE } from "@/lib/seo";
import { settle } from "@/lib/settlement";
import { keyFromHash, SharedActionSchema } from "@/lib/shared-game";
import { type ConnectionStatus as Status, statusAnnouncement } from "@/lib/shared-game-sync";
import { resultsText } from "@/lib/summaries";
import { DEFAULT_THEME, type Theme } from "@/lib/theme";

const noop = () => undefined;

function BackButton({ step, onClick }: { step: string; onClick: () => void }) {
  return (
    <Button variant="secondary" aria-label={`Back to ${step}`} onClick={onClick}>
      <span aria-hidden="true">‹ </span>
      {step}
    </Button>
  );
}

export type SharedGameAppProps = {
  id: string;
  /** Rendered by the page (it needs the request time) and shown inside the bottom bar. */
  footer?: ReactNode;
};

/**
 * A shared game opened from a link (SPEC-0003). Takes the key out of the address bar, follows the
 * game by polling, and shows the same four steps as a solo game. Each device keeps its own step.
 * A device with edit access changes the game like a solo player does: each change shows at once and
 * is sent in the background, kept and retried while offline (REQ-0003-10, -14). Everyone else
 * watches, with the same screens read-only (REQ-0003-06).
 */
export function SharedGameApp({ id, footer }: SharedGameAppProps) {
  const [join, setJoin] = useState<{ checked: boolean; key: string | null }>({
    checked: false,
    key: null,
  });
  const [screen, setScreen] = useState<Screen>("table");
  const [copy, setCopy] = useState<CopyState>({ kind: "idle" });
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [message, setMessage] = useState("");
  const [seenStatus, setSeenStatus] = useState<Status>("live");
  const [seenStarted, setSeenStarted] = useState<boolean | null>(null);
  const [seenGame, setSeenGame] = useState<GameState | null>(null);
  const [seenRejected, setSeenRejected] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buyInRef = useRef<HTMLInputElement>(null);
  const firstChipRef = useRef<HTMLInputElement>(null);
  /** Set by a step change the person made, so focus moves only then, never on load. */
  const focusTitle = useRef(false);

  // Read the key from the link, remember it so a reload still works, and take it out of the
  // address bar so it is not copied or shared by accident (REQ-0003-04). A second link for this
  // game pasted into the same tab only changes the `#` part, which the browser does not reload.
  useEffect(() => {
    const takeKeyFromLink = (): string | null => {
      const fromLink = keyFromHash(window.location.hash);
      if (fromLink) {
        rememberKey(id, fromLink);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      return fromLink;
    };
    const onHashChange = () => {
      const fromLink = takeKeyFromLink();
      if (fromLink) setJoin({ checked: true, key: fromLink });
    };
    const first = takeKeyFromLink();
    // One-time read of an external system (the address bar and storage) after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoin({ checked: true, key: first ?? keyFor(id) });
    setTheme(loadTheme());
    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [id]);

  const feed = useSharedGame(id, join.key);
  const editor = useSharedEditor({ id, key: join.key, feed });
  const view = editor.view;
  const ready = view.phase === "ready" ? view : null;
  const status: Status = view.phase === "unavailable" ? "live" : view.status;
  // Only a device with edit access can change a game that is not archived (REQ-0003-06, -07).
  const canEdit = ready !== null && ready.snapshot.role === "edit" && !ready.archived;

  // Say when the connection changes, in words (REQ-0003-13).
  if (status !== seenStatus) {
    setSeenStatus(status);
    const text = statusAnnouncement(seenStatus, status);
    if (text) setMessage(text);
  }
  // Everyone waiting follows the host to the table the moment the game starts (REQ-0003-15).
  const started = ready ? ready.snapshot.started : null;
  if (started !== seenStarted) {
    setSeenStarted(started);
    if (seenStarted === false && started === true) {
      setScreen("table");
      setMessage("The game has started.");
    }
  }
  // A change that could not be saved is said, not only shown (REQ-0003-23).
  if (editor.rejected !== seenRejected) {
    setSeenRejected(editor.rejected);
    if (editor.rejected) setMessage(editor.rejected);
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.title = `${STEP_TITLES[screen]} · ${SITE.name}`;
    titleRef.current?.focus({ preventScroll: true });
  }, [screen]);

  const game: GameState | null = useMemo(
    () => (ready ? { ...ready.snapshot.game, screen } : null),
    [ready, screen],
  );
  const money = useMemo(() => moneyFormatter(game?.currency ?? "EUR"), [game?.currency]);
  const settlement = useMemo(() => (game ? settle(game) : null), [game]);

  // Say what changed on the current step, from this device or another: the player count, or who
  // rebought and the new pot. Several changes in one update become one sentence (REQ-0003-29).
  if (game !== seenGame) {
    setSeenGame(game);
    if (seenGame && game) {
      const text = remoteChanges(seenGame, game, money);
      if (text) setMessage(text);
    }
  }

  const { send } = editor;
  /** The screens speak the solo app's actions; the ones a shared game accepts become edits. */
  const dispatch = useCallback(
    (action: GameAction) => {
      const parsed = SharedActionSchema.safeParse(action);
      if (parsed.success) send(parsed.data);
    },
    [send],
  );

  const go = (next: Screen) => {
    setCopy({ kind: "idle" });
    if (next === screen) {
      window.scrollTo(0, 0);
      titleRef.current?.focus({ preventScroll: true });
    } else {
      focusTitle.current = true;
    }
    setScreen(next);
  };

  /** "Start the game" stays focusable when it can't be used and leads to the problem (REQ-0002-08). */
  const startGame = () => {
    if (!game) return;
    if (canStartGame(game)) {
      send({ type: "startGame" });
      return;
    }
    (game.buyIn <= 0 ? buyInRef : firstChipRef).current?.focus();
  };

  const copyResults = async () => {
    if (!settlement) return;
    const text = resultsText(settlement, money, new Date().toLocaleDateString());
    const copied = await copyToClipboard(text);
    setCopy(copied ? { kind: "copied" } : { kind: "fallback", text });
    setMessage(
      copied ? "Results copied." : "Couldn't copy. The results are shown as text to select.",
    );
  };

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  const unavailable = view.phase === "unavailable" || (join.checked && join.key === null);
  const showGame = ready && game && settlement && ready.snapshot.started;
  // The host can fill in Setup and start the game; everyone else waits (REQ-0003-15).
  const settingUp = ready && game && !ready.snapshot.started && canEdit;

  const statusRow = ready && (
    <>
      <ConnectionStatus status={ready.status} online={ready.online} pending={editor.pending} />
      {editor.rejected && (
        <Notice notice={{ kind: "warn", text: editor.rejected }}>
          <Button variant="link" onClick={editor.dismissRejected}>
            Dismiss
          </Button>
        </Notice>
      )}
      <WatchNotice access={ready.snapshot.role} archived={ready.archived} />
    </>
  );

  let body: ReactNode;
  if (unavailable) {
    body = <GameUnavailable />;
  } else if (!ready) {
    body = (
      <p className="mt-7 text-text-muted" role="status">
        {view.phase === "loading" && view.status !== "live"
          ? "Couldn't reach the game. Trying again…"
          : "Opening the game…"}
      </p>
    );
  } else if (settingUp) {
    body = (
      <ReadOnlyContext value={false}>
        {statusRow}
        <SetupScreen
          game={game}
          money={money}
          photoCountingEnabled={false}
          dispatch={dispatch}
          buyInRef={buyInRef}
          firstChipRef={firstChipRef}
          onAddChip={() => {
            dispatch({ type: "addChip", chipId: randomId() });
          }}
          onAutoFill={() => {
            dispatch({ type: "autoFillChips", chipIds: [randomId(), randomId(), randomId()] });
          }}
        />
      </ReadOnlyContext>
    );
  } else if (!ready.snapshot.started) {
    body = (
      <>
        <WaitingForHost />
        {statusRow}
      </>
    );
  } else if (showGame) {
    body = (
      <ReadOnlyContext value={!canEdit}>
        {statusRow}
        {screen === "setup" && (
          <SetupScreen
            game={game}
            money={money}
            photoCountingEnabled={false}
            dispatch={dispatch}
            buyInRef={buyInRef}
            firstChipRef={firstChipRef}
            onAddChip={() => {
              dispatch({ type: "addChip", chipId: randomId() });
            }}
            onAutoFill={() => {
              dispatch({ type: "autoFillChips", chipIds: [randomId(), randomId(), randomId()] });
            }}
          />
        )}
        {screen === "table" && <TableScreen game={game} money={money} dispatch={dispatch} />}
        {screen === "cashout" && (
          <CashOutScreen game={game} money={money} dispatch={dispatch} onPhoto={noop} />
        )}
        {screen === "settle" && (
          <SettleScreen
            game={game}
            settlement={settlement}
            money={money}
            copy={copy}
            resetConfirming={false}
            allowReset={false}
            onScaleChange={(scale) => {
              dispatch({ type: "setScale", scale });
            }}
            onSpreadByChange={(spreadBy) => {
              dispatch({ type: "setSpreadBy", spreadBy });
            }}
            onCopy={() => {
              void copyResults();
            }}
            onBackToSetup={() => {
              go("setup");
            }}
            onResetConfirmingChange={noop}
            onReset={noop}
          />
        )}
      </ReadOnlyContext>
    );
  } else {
    body = null;
  }

  return (
    <StepTitleContext value={titleRef}>
      <LiveAnnouncer message={message} />
      <AppHeader>{showGame ? <StepsNav current={screen} onSelect={go} /> : null}</AppHeader>
      <main id="main" className="mx-auto max-w-app px-4 pt-2 pb-(--bar-clearance) short:pb-4">
        {body}
      </main>
      <ActionBar
        footer={
          <>
            {footer}
            <ThemeToggle theme={theme} onChange={changeTheme} />
          </>
        }
      >
        {settingUp && (
          <Button
            variant="primary"
            aria-disabled={!canStartGame(game)}
            aria-describedby="setup-summary"
            onClick={startGame}
          >
            Start the game
          </Button>
        )}
        {showGame && screen === "setup" && (
          <Button
            variant="primary"
            onClick={() => {
              go("table");
            }}
          >
            See the table
          </Button>
        )}
        {showGame && screen === "table" && (
          <>
            <BackButton
              step="Setup"
              onClick={() => {
                go("setup");
              }}
            />
            <Button
              variant="primary"
              onClick={() => {
                go("cashout");
              }}
            >
              Cash out
            </Button>
          </>
        )}
        {showGame && screen === "cashout" && (
          <>
            <BackButton
              step="Table"
              onClick={() => {
                go("table");
              }}
            />
            <Button
              variant="primary"
              onClick={() => {
                go("settle");
              }}
            >
              Settle up
            </Button>
          </>
        )}
        {showGame && screen === "settle" && (
          <BackButton
            step="Cash out"
            onClick={() => {
              go("cashout");
            }}
          />
        )}
      </ActionBar>
    </StepTitleContext>
  );
}
