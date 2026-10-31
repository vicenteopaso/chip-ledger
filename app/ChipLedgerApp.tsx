"use client";

import { type ReactNode, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { ActionBar } from "@/app/components/ActionBar";
import { AppHeader } from "@/app/components/AppHeader";
import { GamesControl } from "@/app/GamesControl";
import { HeaderButton } from "@/app/components/HeaderButton";
import { ShareControl } from "@/app/ShareControl";
import { Button } from "@/app/components/Button";
import { CashOutScreen } from "@/app/components/CashOutScreen";
import { LiveAnnouncer } from "@/app/components/LiveAnnouncer";
import type { PhotoState } from "@/app/components/PlayerCashCard";
import { type CopyState, SettleScreen } from "@/app/components/SettleScreen";
import { SetupScreen } from "@/app/components/SetupScreen";
import { StepsNav } from "@/app/components/StepsNav";
import { TableScreen } from "@/app/components/TableScreen";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { StepTitleContext } from "@/app/components/Typography";
import { changeAnnouncement } from "@/lib/announcements";
import {
  activePlayers,
  canStartGame,
  createGame,
  type GameState,
  playerName,
  type Screen,
  STEP_TITLES,
} from "@/lib/game";
import { gameReducer } from "@/lib/game-reducer";
import { randomId, sequentialIds } from "@/lib/ids";
import { type MoneyFormatter, moneyFormatter } from "@/lib/money";
import {
  COUNTING_STATUS,
  photoColorsFor,
  photoErrorStatus,
  photoResultStatus,
} from "@/lib/photo-count";
import { gameTitle } from "@/lib/games-list";
import { settle } from "@/lib/settlement";
import { SharedGameBodySchema } from "@/lib/shared-game";
import { SITE } from "@/lib/seo";
import { countCheckSummary, resultsText, setupSummary } from "@/lib/summaries";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { canShare, shareText } from "@/lib/infra/web-share";
import { applyTheme, loadTheme, saveTheme } from "@/lib/infra/theme-storage";
import { DEFAULT_THEME, type Theme } from "@/lib/theme";
import { loadSavedGame, saveGame } from "@/lib/infra/game-storage";
import { requestPhotoCount } from "@/lib/infra/photo-count-client";

/**
 * The bottom bar's back button: visible "‹ <step>", named "Back to <step>" (REQ-0002-25). The
 * name contains the visible text; the arrow is decorative.
 */
function BackButton({ step, onClick }: { step: string; onClick: () => void }) {
  return (
    <Button variant="secondary" aria-label={`Back to ${step}`} onClick={onClick}>
      <span aria-hidden="true">‹ </span>
      {step}
    </Button>
  );
}

/** Locale for the server render and the first client render, so their markup matches. */
const RENDER_LOCALE = "en-US";

const defaultGame = () => createGame(sequentialIds("default-"));

/** The summary whose change is announced on each step, if any (REQ-0002-07). */
function stepSummary(game: GameState, money: MoneyFormatter) {
  if (game.screen === "setup") return setupSummary(game, money);
  if (game.screen === "cashout") return countCheckSummary(game, money);
  return undefined;
}

export type ChipLedgerAppProps = {
  photoCountingEnabled: boolean;
  /** The sharing service is set up, so Share is offered (SPEC-0003 REQ-0003-27). */
  sharingEnabled?: boolean;
  /** Rendered by the page (it needs the request time) and shown inside the bottom bar. */
  footer?: ReactNode;
};

/**
 * Owns the game state and wires browser adapters (storage, clipboard, photo counting) to the
 * presentational screens. The only component that talks to `lib/infra`.
 */
export function ChipLedgerApp({
  photoCountingEnabled,
  sharingEnabled = false,
  footer,
}: ChipLedgerAppProps) {
  const [game, dispatch] = useReducer(gameReducer, undefined, defaultGame);
  const [hydrated, setHydrated] = useState(false);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [copy, setCopy] = useState<CopyState>({ kind: "idle" });
  const [resetConfirming, setResetConfirming] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [message, setMessage] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [seen, setSeen] = useState<{ game: GameState; hydrated: boolean; summary?: string }>(
    () => ({ game, hydrated }),
  );
  const thumbnails = useRef(new Set<string>());
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buyInRef = useRef<HTMLInputElement>(null);
  const firstChipRef = useRef<HTMLInputElement>(null);
  /** Set by a step change the person made, so focus moves only then, never on load. */
  const focusTitle = useRef(false);

  // Restore the saved game once, after hydration (REQ-0001-25). Browser storage and the
  // browser's locale are not available during the server render.
  useEffect(() => {
    const saved = loadSavedGame();
    if (saved) dispatch({ type: "replace", game: saved });
    // One-time sync from external systems after mount; there is no event to subscribe to. The
    // pre-paint script in the layout already applied a forced theme; this only syncs the button.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(loadTheme());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveGame(game);
  }, [game, hydrated]);

  // A step the person opened: scroll to the top, name it in the document title, and move focus
  // to its title so keyboard and screen-reader users land on the new content (REQ-0002-02).
  // Not on load, so the served title stays as is for crawlers (SPEC-0002 §6).
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!focusTitle.current) return;
    focusTitle.current = false;
    document.title = `${STEP_TITLES[game.screen]} · ${SITE.name}`;
    titleRef.current?.focus({ preventScroll: true });
  }, [game.screen]);

  useEffect(() => {
    const urls = thumbnails.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const money = useMemo(
    () => moneyFormatter(game.currency, hydrated ? undefined : RENDER_LOCALE),
    [game.currency, hydrated],
  );
  const settlement = useMemo(() => settle(game), [game]);
  const summary = stepSummary(game, money);

  // Announce edits on the current step: the player count, a rebuy with the new pot, or a change
  // of summary message, but not every keystroke that only changes an amount (REQ-0002-07).
  // Compared with the previous render; restoring a saved game or changing step says nothing.
  if (seen.game !== game || seen.hydrated !== hydrated) {
    setSeen({ game, hydrated, summary: summary?.code });
    if (seen.hydrated && seen.game.screen === game.screen) {
      const change = changeAnnouncement(seen.game, game, money);
      const summaryChanged = summary && summary.code !== seen.summary;
      const text = [change, summaryChanged ? summary.text : null].filter(Boolean).join(" ");
      if (text) setMessage(text);
    }
  }

  const clearPhotos = () => {
    for (const url of thumbnails.current) URL.revokeObjectURL(url);
    thumbnails.current.clear();
    setPhotos({});
  };

  const go = (screen: Screen) => {
    setCopy({ kind: "idle" });
    setResetConfirming(false);
    // A change of screen scrolls and moves focus in the effect above; reopening the same
    // screen does both here.
    if (screen === game.screen) {
      window.scrollTo(0, 0);
      titleRef.current?.focus({ preventScroll: true });
    } else {
      focusTitle.current = true;
    }
    dispatch({ type: "go", screen });
  };

  /** "Start the game" stays focusable when it can't be used and leads to the problem (REQ-0002-08). */
  const startGame = () => {
    if (canStartGame(game)) {
      go("table");
      return;
    }
    (game.buyIn <= 0 ? buyInRef : firstChipRef).current?.focus();
  };

  const updatePhoto = (playerId: string, update: Partial<PhotoState>) => {
    setPhotos((current) => ({
      ...current,
      [playerId]: { busy: false, ...current[playerId], ...update },
    }));
  };

  const countPhoto = async (playerId: string, file: File) => {
    if (photos[playerId]?.busy) return;
    const previous = photos[playerId]?.thumbnailUrl;
    if (previous) {
      URL.revokeObjectURL(previous);
      thumbnails.current.delete(previous);
    }
    const thumbnailUrl = URL.createObjectURL(file);
    thumbnails.current.add(thumbnailUrl);
    updatePhoto(playerId, { busy: true, thumbnailUrl, status: COUNTING_STATUS });

    const player = activePlayers(game).find((candidate) => candidate.id === playerId);
    const name = player ? playerName(game, player) : "";
    setMessage(`${name}: ${COUNTING_STATUS.text}`);
    const outcome = await requestPhotoCount(file, photoColorsFor(game));
    const status = outcome.ok ? photoResultStatus(outcome.result) : photoErrorStatus(outcome.code);
    if (outcome.ok) {
      dispatch({ type: "applyPhotoCounts", playerId, counts: outcome.result.counts });
    }
    updatePhoto(playerId, { busy: false, status });
    setMessage(`${name}: ${status.text}`);
  };

  const shareResults = async () => {
    const text = resultsText(settlement, money, new Date().toLocaleDateString());
    const outcome = await shareText({ title: "Poker night results", text });
    if (outcome === "shared") setMessage("Results shared.");
    // The menu would not open (not a cancel): copy instead, so the results are not lost.
    if (outcome === "failed") await copyResults();
  };

  const copyResults = async () => {
    const text = resultsText(settlement, money, new Date().toLocaleDateString());
    const copied = await copyToClipboard(text);
    setCopy(copied ? { kind: "copied" } : { kind: "fallback", text });
    setMessage(
      copied ? "Results copied." : "Couldn't copy. The results are shown as text to select.",
    );
  };

  /** Confirmed in place by ConfirmInline (REQ-0002-11), so this always erases. */
  const reset = () => {
    clearPhotos();
    dispatch({ type: "replace", game: createGame(randomId) });
    go("setup");
  };

  const newGameSamePlayers = () => {
    clearPhotos();
    dispatch({ type: "newGameSamePlayers" });
    go("table");
  };

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  };

  return (
    <StepTitleContext value={titleRef}>
      <LiveAnnouncer message={message} />
      <AppHeader
        action={
          sharingEnabled && hydrated ? (
            <div className="flex items-center gap-2">
              <HeaderButton
                label="Games"
                icon="games"
                onClick={() => {
                  setGamesOpen(true);
                }}
              />
              <HeaderButton
                label="Share"
                icon="share"
                onClick={() => {
                  setShareOpen(true);
                }}
              />
            </div>
          ) : null
        }
      >
        <StepsNav current={game.screen} onSelect={go} />
      </AppHeader>
      {sharingEnabled && hydrated && (
        <GamesControl
          open={gamesOpen}
          onOpenChange={setGamesOpen}
          current={null}
          ownTitle={gameTitle(game)}
        />
      )}
      {sharingEnabled && hydrated && (
        <ShareControl
          open={shareOpen}
          onOpenChange={setShareOpen}
          shared={null}
          makeRequest={() => ({
            started: game.screen !== "setup",
            game: SharedGameBodySchema.parse(game),
          })}
        />
      )}
      <main id="main" className="mx-auto max-w-app px-4 pt-2 pb-(--bar-clearance) short:pb-4">
        {game.screen === "setup" && (
          <SetupScreen
            game={game}
            money={money}
            photoCountingEnabled={photoCountingEnabled}
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
        {game.screen === "table" && <TableScreen game={game} money={money} dispatch={dispatch} />}
        {game.screen === "cashout" && (
          <CashOutScreen
            game={game}
            money={money}
            photos={photoCountingEnabled ? photos : undefined}
            dispatch={dispatch}
            onPhoto={(playerId, file) => {
              void countPhoto(playerId, file);
            }}
          />
        )}
        {game.screen === "settle" && (
          <SettleScreen
            game={game}
            settlement={settlement}
            money={money}
            copy={copy}
            resetConfirming={resetConfirming}
            onScaleChange={(scale) => {
              dispatch({ type: "setScale", scale });
            }}
            onSpreadByChange={(spreadBy) => {
              dispatch({ type: "setSpreadBy", spreadBy });
            }}
            onCopy={() => {
              void copyResults();
            }}
            {...(canShare()
              ? {
                  onShare: () => {
                    void shareResults();
                  },
                }
              : {})}
            onBackToSetup={() => {
              go("setup");
            }}
            onResetConfirmingChange={setResetConfirming}
            onReset={reset}
          />
        )}
      </main>
      <ActionBar
        footer={
          <>
            {footer}
            <ThemeToggle theme={theme} onChange={changeTheme} />
          </>
        }
      >
        {game.screen === "setup" && (
          <Button
            variant="primary"
            aria-disabled={!canStartGame(game)}
            aria-describedby="setup-summary"
            onClick={startGame}
          >
            Start the game
          </Button>
        )}
        {game.screen === "table" && (
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
        {game.screen === "cashout" && (
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
        {game.screen === "settle" && (
          <>
            <BackButton
              step="Cash out"
              onClick={() => {
                go("cashout");
              }}
            />
            {/* The likely next step at the end of a night (REQ-0002-12, amends REQ-0001-02). */}
            <Button variant="primary" onClick={newGameSamePlayers}>
              New game, same players
            </Button>
          </>
        )}
      </ActionBar>
    </StepTitleContext>
  );
}
