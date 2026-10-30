"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

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
import { WaitingForHost } from "@/app/components/WaitingForHost";
import { WatchNotice } from "@/app/components/WatchNotice";
import { useSharedGame } from "@/app/useSharedGame";
import { type GameState, type Screen, STEP_TITLES } from "@/lib/game";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { keyFor, rememberKey } from "@/lib/infra/joined-games-storage";
import { applyTheme, loadTheme, saveTheme } from "@/lib/infra/theme-storage";
import { moneyFormatter } from "@/lib/money";
import { SITE } from "@/lib/seo";
import { settle } from "@/lib/settlement";
import { keyFromHash } from "@/lib/shared-game";
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
 * For now every device only watches; editing arrives with the action pipeline (tasks T-21 to T-23),
 * so the screens are rendered read-only (REQ-0003-06).
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
  const titleRef = useRef<HTMLHeadingElement>(null);
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

  const view = useSharedGame(id, join.key);
  const ready = view.phase === "ready" ? view : null;
  const status: Status = view.phase === "unavailable" ? "live" : view.status;

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
  } else if (!ready.snapshot.started) {
    body = (
      <>
        <WaitingForHost />
        <ConnectionStatus status={ready.status} online={ready.online} />
        <WatchNotice access={ready.snapshot.role} archived={ready.archived} />
      </>
    );
  } else if (showGame) {
    body = (
      <ReadOnlyContext value={true}>
        <ConnectionStatus status={ready.status} online={ready.online} />
        <WatchNotice access={ready.snapshot.role} archived={ready.archived} />
        {screen === "setup" && (
          <SetupScreen
            game={game}
            money={money}
            photoCountingEnabled={false}
            dispatch={noop}
            onAddChip={noop}
            onAutoFill={noop}
          />
        )}
        {screen === "table" && <TableScreen game={game} money={money} dispatch={noop} />}
        {screen === "cashout" && (
          <CashOutScreen game={game} money={money} dispatch={noop} onPhoto={noop} />
        )}
        {screen === "settle" && (
          <SettleScreen
            game={game}
            settlement={settlement}
            money={money}
            copy={copy}
            resetConfirming={false}
            onScaleChange={noop}
            onSpreadByChange={noop}
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
