import { Button } from "@/app/components/Button";
import { ChipRow } from "@/app/components/ChipRow";
import { ChipStackArt } from "@/app/components/ChipStackArt";
import { DraftInput } from "@/app/components/DraftInput";
import { Notice } from "@/app/components/Notice";
import { Lede, PageTitle, SectionTitle, Hint } from "@/app/components/Typography";
import { CHIP_COLORS, MIXED } from "@/lib/chips";
import { activePlayers, type GameState, PLAYER_COUNTS, UNIFORM_CHIP_ID } from "@/lib/game";
import type { GameAction } from "@/lib/game-reducer";
import { CURRENCIES, CurrencySchema, type MoneyFormatter, parseMoney } from "@/lib/money";
import { setupSummary } from "@/lib/summaries";

export type SetupScreenProps = {
  game: GameState;
  money: MoneyFormatter;
  photoCountingEnabled: boolean;
  dispatch: (action: GameAction) => void;
  onAddChip: () => void;
  onAutoFill: () => void;
};

const FIELD_BASE =
  "block min-w-0 rounded-md border-control border-border-control bg-surface px-3.5 py-3 focus:border-accent";
const FIELD = `${FIELD_BASE} w-full text-body`;

/** The single "All colors" row has no color to change and cannot be removed. */
const ignore = () => undefined;

/** Step 1: players, buy-in, and the starting stack (REQ-0001-03 … -07). */
export function SetupScreen({
  game,
  money,
  photoCountingEnabled,
  dispatch,
  onAddChip,
  onAutoFill,
}: SetupScreenProps) {
  const usedColors = game.chips.map((chip) => chip.color);
  return (
    <>
      <ChipStackArt />
      <PageTitle>Chip Ledger</PageTitle>
      <Lede>
        {photoCountingEnabled
          ? "Track buy-ins during the game, count chips from a photo at the end, and see exactly who pays whom."
          : "Track buy-ins during the game, count chips at the end, and see exactly who pays whom."}
      </Lede>

      <SectionTitle>How many players?</SectionTitle>
      <div className="flex gap-2" role="group" aria-label="Number of players">
        {PLAYER_COUNTS.map((count) => (
          <button
            key={count}
            type="button"
            aria-pressed={game.count === count}
            className="press flex-1 rounded-lg border-2 border-border bg-surface py-3.5 text-3xl font-extrabold aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:text-accent-ink"
            onClick={() => {
              dispatch({ type: "setPlayerCount", count });
            }}
          >
            {count}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {activePlayers(game).map((player, index) => {
          const id = `player-${player.id}-name`;
          return (
            <div key={player.id}>
              <label htmlFor={id} className="sr-only">
                {`Name of player ${String(index + 1)}`}
              </label>
              <input
                id={id}
                className={FIELD}
                value={player.name}
                placeholder={`Player ${String(index + 1)}`}
                autoComplete="off"
                autoCapitalize="words"
                maxLength={200}
                onChange={(event) => {
                  dispatch({ type: "setName", playerId: player.id, name: event.target.value });
                }}
              />
            </div>
          );
        })}
      </div>

      <SectionTitle>Buy-in per player</SectionTitle>
      <div className="flex gap-2">
        <label htmlFor="currency" className="sr-only">
          Currency
        </label>
        <select
          id="currency"
          className={`${FIELD_BASE} w-23 flex-none text-body`}
          value={game.currency}
          onChange={(event) => {
            dispatch({ type: "setCurrency", currency: CurrencySchema.parse(event.target.value) });
          }}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency}>{currency}</option>
          ))}
        </select>
        <label htmlFor="buy-in" className="sr-only">
          Buy-in amount
        </label>
        <DraftInput
          id="buy-in"
          className={`${FIELD_BASE} w-full text-4xl font-semibold`}
          inputMode="decimal"
          value={game.buyIn}
          format={String}
          parse={(text) => parseMoney(text, game.currency)}
          onValueChange={(buyIn) => {
            dispatch({ type: "setBuyIn", buyIn });
          }}
        />
      </div>

      <SectionTitle>Chips in each starting stack</SectionTitle>
      <label className="mb-3 flex items-start gap-3 text-md">
        <input
          type="checkbox"
          className="mt-px size-5.5 flex-none accent-accent"
          checked={game.uniformValue}
          onChange={(event) => {
            dispatch({ type: "setUniformValue", enabled: event.target.checked });
          }}
        />
        <span>Use one value for all chips</span>
      </label>
      <Hint>
        {game.uniformValue
          ? "How many chips each player gets, and what one chip is worth."
          : "Color, how many each player gets, and what one chip is worth."}
      </Hint>
      {game.autoChips ? (
        <Hint>The chips adjust to the buy-in. Edit any chip to set them yourself.</Hint>
      ) : (
        <Button variant="link" onClick={onAutoFill}>
          Fill the chips to match the buy-in
        </Button>
      )}
      {game.uniformValue ? (
        <ChipRow
          chip={{ id: UNIFORM_CHIP_ID, color: MIXED, ...game.uniformChip }}
          usedColors={usedColors}
          canRemove={false}
          money={money}
          currency={game.currency}
          onColorChange={ignore}
          onCountChange={(count) => {
            dispatch({ type: "setUniformChipCount", count });
          }}
          onValueChange={(value) => {
            dispatch({ type: "setUniformChipValue", value });
          }}
          onRemove={ignore}
        />
      ) : (
        <>
          {game.chips.map((chip) => (
            <ChipRow
              key={chip.id}
              chip={chip}
              usedColors={usedColors}
              canRemove={game.chips.length > 1}
              money={money}
              currency={game.currency}
              onColorChange={(color) => {
                dispatch({ type: "setChipColor", chipId: chip.id, color });
              }}
              onCountChange={(count) => {
                dispatch({ type: "setChipCount", chipId: chip.id, count });
              }}
              onValueChange={(value) => {
                dispatch({ type: "setChipValue", chipId: chip.id, value });
              }}
              onRemove={() => {
                dispatch({ type: "removeChip", chipId: chip.id });
              }}
            />
          ))}
          {usedColors.length < CHIP_COLORS.length && (
            <Button variant="link" onClick={onAddChip}>
              Add a chip color
            </Button>
          )}
        </>
      )}
      <div role="status">
        <Notice notice={setupSummary(game, money)} />
      </div>
    </>
  );
}
