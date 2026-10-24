import { CountCheck } from "@/app/components/CountCheck";
import { type PhotoState, PlayerCashCard } from "@/app/components/PlayerCashCard";
import { Lede, PageTitle } from "@/app/components/Typography";
import { activePlayers, cashOutValue, type GameState, playerName } from "@/lib/game";
import type { GameAction } from "@/lib/game-reducer";
import type { MoneyFormatter } from "@/lib/money";

export type CashOutScreenProps = {
  game: GameState;
  money: MoneyFormatter;
  /** Photo state per player id; `undefined` when photo counting is disabled (REQ-0001-13). */
  photos?: Record<string, PhotoState>;
  dispatch: (action: GameAction) => void;
  onPhoto: (playerId: string, file: File) => void;
};

const IDLE: PhotoState = { busy: false };

/** Step 3: each player's chips and the count check (REQ-0001-10 … -14). */
export function CashOutScreen({ game, money, photos, dispatch, onPhoto }: CashOutScreenProps) {
  return (
    <>
      <PageTitle>Cash out</PageTitle>
      <Lede>
        {photos
          ? "Tap Take photo on each player's card to snap their chips or pick a picture from your library, then check the counts. You can also type the counts in."
          : "Type each player's chip counts, then check the count below."}
      </Lede>
      {activePlayers(game).map((player) => (
        <PlayerCashCard
          key={player.id}
          player={player}
          name={playerName(game, player)}
          value={money(cashOutValue(game, player))}
          chips={game.chips}
          photo={photos ? (photos[player.id] ?? IDLE) : undefined}
          onCountChange={(chipId, count) => {
            dispatch({ type: "setPlayerChipCount", playerId: player.id, chipId, count });
          }}
          onPhoto={(file) => {
            onPhoto(player.id, file);
          }}
        />
      ))}
      <CountCheck game={game} money={money} />
    </>
  );
}
