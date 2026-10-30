import { Hint, Lede, PageTitle } from "@/app/components/Typography";
import { activePlayers, type GameState, playerName, pot, totalBuyins } from "@/lib/game";
import type { GameAction } from "@/lib/game-reducer";
import type { MoneyFormatter } from "@/lib/money";

export type TableScreenProps = {
  game: GameState;
  money: MoneyFormatter;
  dispatch: (action: GameAction) => void;
};

/** Unavailable at a limit via `aria-disabled`, so keyboard focus stays put (REQ-0002-13). */
const STEP_BUTTON =
  "press size-11.5 rounded-lg border-0 bg-transparent text-4xl font-semibold hover:not-aria-disabled:bg-surface-hover aria-disabled:text-disabled-ink";

/** Step 2: rebuys during the game and the running pot (REQ-0001-08, -09). */
export function TableScreen({ game, money, dispatch }: TableScreenProps) {
  return (
    <>
      <PageTitle>At the table</PageTitle>
      <Lede>{`Press + whenever someone buys back in for another ${money(game.buyIn)} stack.`}</Lede>
      {activePlayers(game).map((player) => {
        const name = playerName(game, player);
        return (
          <div key={player.id} className="flex items-center gap-3 border-b border-border py-3.5">
            <div className="min-w-0 flex-1">
              <b className="block truncate text-xl">{name}</b>
              <span className="text-md text-text-muted">{`${money(player.buyins * game.buyIn)} in`}</span>
            </div>
            <div className="flex items-center rounded-lg border-control border-border bg-surface">
              <button
                type="button"
                className={STEP_BUTTON}
                aria-label={`Remove a buy-in for ${name}`}
                aria-disabled={player.buyins <= 0}
                onClick={() => {
                  dispatch({ type: "adjustBuyins", playerId: player.id, delta: -1 });
                }}
              >
                −
              </button>
              {/* Not live: the page's live region announces the change with the pot (REQ-0002-07). */}
              <output
                className="min-w-7 text-center text-2xl font-extrabold"
                aria-label={`Buy-ins for ${name}`}
                aria-live="off"
              >
                {player.buyins}
              </output>
              <button
                type="button"
                className={STEP_BUTTON}
                aria-label={`Add a buy-in for ${name}`}
                onClick={() => {
                  dispatch({ type: "adjustBuyins", playerId: player.id, delta: 1 });
                }}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
      <div className="mt-5.5 flex items-baseline justify-between border-b border-border py-4.5">
        <span className="text-text-muted">Money in the pot</span>
        <b className="text-5xl font-extrabold tracking-display">{money(pot(game))}</b>
      </div>
      <Hint className="mt-3">{`${String(totalBuyins(game))} buy-ins so far.`}</Hint>
    </>
  );
}
