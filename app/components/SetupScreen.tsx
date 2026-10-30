import { Button } from "@/app/components/Button";
import type { Ref } from "react";

import { ChipRow, ChipRowHeader } from "@/app/components/ChipRow";
import { ChipStackArt } from "@/app/components/ChipStackArt";
import { DraftInput } from "@/app/components/DraftInput";
import { Notice } from "@/app/components/Notice";
import { Stepper } from "@/app/components/Stepper";
import { Lede, PageTitle, SectionTitle, Hint } from "@/app/components/Typography";
import { CHIP_COLORS, MIXED } from "@/lib/chips";
import {
  activePlayers,
  type GameState,
  MAX_PLAYERS,
  MIN_PLAYERS,
  UNIFORM_CHIP_ID,
} from "@/lib/game";
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
  /** Focus targets for an invalid "Start the game" (REQ-0002-08). */
  buyInRef?: Ref<HTMLInputElement>;
  firstChipRef?: Ref<HTMLInputElement>;
};

const FIELD_BASE =
  "block min-w-0 rounded-md border-control border-border-control bg-surface px-3.5 py-3 focus:border-accent";
const FIELD = `${FIELD_BASE} w-full text-body`;
/** Visible field label (REQ-0002-05). */
const LABEL = "mb-1 block text-md font-semibold text-text-muted";

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
  buyInRef,
  firstChipRef,
}: SetupScreenProps) {
  const usedColors = game.chips.map((chip) => chip.color);
  return (
    <>
      <ChipStackArt />
      {/* The app's name as a brand line; the heading names the step like every other step (REQ-0002-24). */}
      <p className="mt-2 text-lg font-extrabold tracking-display text-accent">Chip Ledger</p>
      <PageTitle>Setup</PageTitle>
      <Lede>
        {photoCountingEnabled
          ? "Track buy-ins during the game, count chips from a photo at the end, and see exactly who pays whom."
          : "Track buy-ins during the game, count chips at the end, and see exactly who pays whom."}
      </Lede>

      <SectionTitle>How many players?</SectionTitle>
      <Stepper
        label="Number of players"
        value={game.count}
        min={MIN_PLAYERS}
        max={MAX_PLAYERS}
        decrementLabel="Fewer players"
        incrementLabel="More players"
        stretch
        onStep={(delta) => {
          dispatch({ type: "setPlayerCount", count: game.count + delta });
        }}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {activePlayers(game).map((player, index) => {
          const id = `player-${player.id}-name`;
          return (
            <div key={player.id}>
              <label htmlFor={id} className={LABEL}>
                {`Player ${String(index + 1)} name`}
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
        <div className="flex w-24 flex-none flex-col">
          <label htmlFor="currency" className={LABEL}>
            Currency
          </label>
          <select
            id="currency"
            className={`${FIELD_BASE} w-full flex-1 text-body`}
            value={game.currency}
            onChange={(event) => {
              dispatch({ type: "setCurrency", currency: CurrencySchema.parse(event.target.value) });
            }}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor="buy-in" className={LABEL}>
            Buy-in<span className="sr-only"> amount</span>
          </label>
          <DraftInput
            id="buy-in"
            ref={buyInRef}
            className={`${FIELD_BASE} w-full text-4xl font-semibold`}
            inputMode="decimal"
            aria-invalid={game.buyIn <= 0}
            aria-describedby="setup-summary"
            value={game.buyIn}
            format={String}
            parse={(text) => parseMoney(text, game.currency)}
            onValueChange={(buyIn) => {
              dispatch({ type: "setBuyIn", buyIn });
            }}
          />
        </div>
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
      <ChipRowHeader />
      {game.uniformValue ? (
        <ChipRow
          countRef={firstChipRef}
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
          {game.chips.map((chip, index) => (
            <ChipRow
              key={chip.id}
              countRef={index === 0 ? firstChipRef : undefined}
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
      {/* Describes "Start the game"; announced by the page's live region on change (REQ-0002-07). */}
      <div id="setup-summary">
        <Notice notice={setupSummary(game, money)} />
      </div>
    </>
  );
}
