"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { ActionBar } from "@/app/components/ActionBar";
import { Button } from "@/app/components/Button";
import { CashOutScreen } from "@/app/components/CashOutScreen";
import type { PhotoState } from "@/app/components/PlayerCashCard";
import { type CopyState, SettleScreen } from "@/app/components/SettleScreen";
import { SetupScreen } from "@/app/components/SetupScreen";
import { StepsNav } from "@/app/components/StepsNav";
import { TableScreen } from "@/app/components/TableScreen";
import { canStartGame, createGame, type Screen } from "@/lib/game";
import { gameReducer } from "@/lib/game-reducer";
import { randomId, sequentialIds } from "@/lib/ids";
import { moneyFormatter } from "@/lib/money";
import {
  COUNTING_STATUS,
  photoColorsFor,
  photoErrorStatus,
  photoResultStatus,
} from "@/lib/photo-count";
import { settle } from "@/lib/settlement";
import { resultsText } from "@/lib/summaries";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { loadSavedGame, saveGame } from "@/lib/infra/game-storage";
import { requestPhotoCount } from "@/lib/infra/photo-count-client";

/** Locale for the server render and the first client render, so their markup matches. */
const RENDER_LOCALE = "en-US";

const defaultGame = () => createGame(sequentialIds("default-"));

export type ChipLedgerAppProps = { photoCountingEnabled: boolean };

/**
 * Owns the game state and wires browser adapters (storage, clipboard, photo counting) to the
 * presentational screens. The only component that talks to `lib/infra`.
 */
export function ChipLedgerApp({ photoCountingEnabled }: ChipLedgerAppProps) {
  const [game, dispatch] = useReducer(gameReducer, undefined, defaultGame);
  const [hydrated, setHydrated] = useState(false);
  const [photos, setPhotos] = useState<Record<string, PhotoState>>({});
  const [copy, setCopy] = useState<CopyState>({ kind: "idle" });
  const [resetArmed, setResetArmed] = useState(false);
  const thumbnails = useRef(new Set<string>());

  // Restore the saved game once, after hydration (REQ-0001-25). Browser storage and the
  // browser's locale are not available during the server render.
  useEffect(() => {
    const saved = loadSavedGame();
    if (saved) dispatch({ type: "replace", game: saved });
    // One-time sync from an external system after mount; there is no event to subscribe to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveGame(game);
  }, [game, hydrated]);

  useEffect(() => {
    window.scrollTo(0, 0);
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

  const clearPhotos = () => {
    for (const url of thumbnails.current) URL.revokeObjectURL(url);
    thumbnails.current.clear();
    setPhotos({});
  };

  const go = (screen: Screen) => {
    setCopy({ kind: "idle" });
    setResetArmed(false);
    // A change of screen scrolls in the effect above; reopening the same screen scrolls here.
    if (screen === game.screen) window.scrollTo(0, 0);
    dispatch({ type: "go", screen });
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

    const outcome = await requestPhotoCount(file, photoColorsFor(game));
    if (outcome.ok) {
      dispatch({ type: "applyPhotoCounts", playerId, counts: outcome.result.counts });
      updatePhoto(playerId, { busy: false, status: photoResultStatus(outcome.result) });
    } else {
      updatePhoto(playerId, { busy: false, status: photoErrorStatus(outcome.code) });
    }
  };

  const copyResults = async () => {
    const text = resultsText(settlement, money, new Date().toLocaleDateString());
    const copied = await copyToClipboard(text);
    setCopy(copied ? { kind: "copied" } : { kind: "fallback", text });
  };

  const reset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      return;
    }
    clearPhotos();
    dispatch({ type: "replace", game: createGame(randomId) });
    go("setup");
  };

  return (
    <>
      <StepsNav current={game.screen} onSelect={go} />
      {game.screen === "setup" && (
        <SetupScreen
          game={game}
          money={money}
          photoCountingEnabled={photoCountingEnabled}
          dispatch={dispatch}
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
          resetArmed={resetArmed}
          onScaleChange={(scale) => {
            dispatch({ type: "setScale", scale });
          }}
          onCopy={() => {
            void copyResults();
          }}
          onNewGame={() => {
            clearPhotos();
            dispatch({ type: "newGameSamePlayers" });
            go("table");
          }}
          onReset={reset}
        />
      )}
      <ActionBar>
        {game.screen === "setup" && (
          <Button
            variant="primary"
            disabled={!canStartGame(game)}
            onClick={() => {
              go("table");
            }}
          >
            Start the game
          </Button>
        )}
        {game.screen === "table" && (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                go("setup");
              }}
            >
              Setup
            </Button>
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
            <Button
              variant="secondary"
              onClick={() => {
                go("table");
              }}
            >
              Table
            </Button>
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
            <Button
              variant="secondary"
              onClick={() => {
                go("cashout");
              }}
            >
              Cash out
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                go("setup");
              }}
            >
              Back to Setup
            </Button>
          </>
        )}
      </ActionBar>
    </>
  );
}
