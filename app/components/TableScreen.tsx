import { Avatar } from "@/app/components/Avatar";
import { useReadOnly } from "@/app/components/ReadOnly";
import { SellChips } from "@/app/components/SellChips";
import { Stepper } from "@/app/components/Stepper";
import { FeltPanel, ListPanel, ListRow } from "@/app/components/Surfaces";
import { Lede, PageTitle } from "@/app/components/Typography";
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
 * running pot, which comes first (REQ-0001-08, -09, SPEC-0004, REQ-0005-05).
 */
export function TableScreen({ game, money, dispatch }: TableScreenProps) {
  const readOnly = useReadOnly();
  return (
    <>
      <PageTitle>At the table</PageTitle>
      <Lede>{`Press + whenever someone buys back in for another ${money(game.buyIn)} stack.`}</Lede>
      {/* The pot first, on the felt: the number the table asks about (REQ-0005-05). Not a live
          region; the page announcer says what changed (REQ-0002-07). */}
      <FeltPanel className="mb-4">
        <p className="text-sm font-semibold tracking-label text-felt-muted uppercase">
          Money in the pot
        </p>
        <p className="mt-1 text-6xl leading-display font-semibold tracking-display">
          {money(pot(game))}
        </p>
        <p className="mt-1 text-md text-felt-muted">{`${String(totalBuyins(game))} buy-ins so far.`}</p>
      </FeltPanel>
      <ListPanel>
        {activePlayers(game).map((player) => {
          const name = playerName(game, player);
          return (
            <ListRow key={player.id} className="flex items-center gap-3">
              <Avatar name={name} optional />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-lg font-semibold">{name}</b>
                <span className="block font-mono text-md whitespace-nowrap">{`${money(moneyIn(game, player))} in`}</span>
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
      </ListPanel>
      {!readOnly && <SellChips game={game} dispatch={dispatch} />}
    </>
  );
}
