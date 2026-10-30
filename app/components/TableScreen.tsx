import { useReadOnly } from "@/app/components/ReadOnly";
import { SellChips } from "@/app/components/SellChips";
import { Stepper } from "@/app/components/Stepper";
import { ListRow } from "@/app/components/Surfaces";
import { Hint, Lede, PageTitle } from "@/app/components/Typography";
import { activePlayers, type GameState, moneyIn, playerName, pot, totalBuyins } from "@/lib/game";
import type { GameAction } from "@/lib/game-reducer";
import type { MoneyFormatter } from "@/lib/money";

export type TableScreenProps = {
  game: GameState;
  money: MoneyFormatter;
  dispatch: (action: GameAction) => void;
};

/**
 * Step 2: each player's money in, rebuys during the game, chip sales between players, and the
 * running pot (REQ-0001-08, -09, SPEC-0004).
 */
export function TableScreen({ game, money, dispatch }: TableScreenProps) {
  const readOnly = useReadOnly();
  return (
    <>
      <PageTitle>At the table</PageTitle>
      <Lede>{`Press + whenever someone buys back in for another ${money(game.buyIn)} stack.`}</Lede>
      {activePlayers(game).map((player) => {
        const name = playerName(game, player);
        return (
          <ListRow key={player.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <b className="block truncate text-xl">{name}</b>
              <span className="block text-2xl font-extrabold">{`${money(moneyIn(game, player))} in`}</span>
              <span className="block text-md text-text-muted">
                {`${String(player.buyins)} ${player.buyins === 1 ? "buy-in" : "buy-ins"}`}
                {player.moved !== 0 &&
                  ` · incl. ${player.moved > 0 ? "+" : "−"}${money(Math.abs(player.moved))} from chip sales`}
              </span>
            </div>
            <Stepper
              label={`Buy-ins for ${name}`}
              value={player.buyins}
              min={0}
              decrementLabel={`Remove a buy-in for ${name}`}
              incrementLabel={`Add a buy-in for ${name}`}
              onStep={(delta) => {
                dispatch({ type: "adjustBuyins", playerId: player.id, delta });
              }}
            />
          </ListRow>
        );
      })}
      {!readOnly && <SellChips game={game} dispatch={dispatch} />}
      <div className="mt-5.5 flex items-baseline justify-between border-b border-border py-4.5">
        <span className="text-text-muted">Money in the pot</span>
        <b className="text-5xl font-extrabold tracking-display">{money(pot(game))}</b>
      </div>
      <Hint className="mt-3">{`${String(totalBuyins(game))} buy-ins so far.`}</Hint>
    </>
  );
}
