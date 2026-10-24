import { Chip } from "@/app/components/Chip";
import { DraftInput } from "@/app/components/DraftInput";
import { availableColors, type ChipColor, ChipColorSchema, MIXED, STACK_LABELS } from "@/lib/chips";
import type { StackChip } from "@/lib/game";
import { type MoneyFormatter, parseCount, parseDecimal } from "@/lib/money";

export type ChipRowProps = {
  /** A color row, or the single "All colors" chip in one-value mode (REQ-0001-28). */
  chip: StackChip;
  usedColors: readonly ChipColor[];
  canRemove: boolean;
  money: MoneyFormatter;
  onColorChange: (color: ChipColor) => void;
  onCountChange: (count: number) => void;
  onValueChange: (value: number) => void;
  onRemove: () => void;
};

const FIELD =
  "block w-full min-w-0 rounded-md border-control border-border-control bg-surface px-2 py-2.5 text-body focus:border-accent";

/** One chip color in the starting stack: color, count per player, value per chip (REQ-0001-05). */
export function ChipRow({
  chip,
  usedColors,
  canRemove,
  money,
  onColorChange,
  onCountChange,
  onValueChange,
  onRemove,
}: ChipRowProps) {
  const label = STACK_LABELS[chip.color];
  const mixed = chip.color === MIXED;
  const countLabel = mixed ? "Chips per player" : `${label} chips per player`;
  const valueLabel = mixed ? "Value of every chip" : `${label} chip value`;
  const ids = {
    color: `chip-${chip.id}-color`,
    count: `chip-${chip.id}-count`,
    value: `chip-${chip.id}-value`,
  };
  return (
    <div className="chip-row grid items-center gap-2 border-b border-border py-2.5">
      <Chip color={chip.color} />
      {chip.color === MIXED ? (
        <span className="pl-1 text-body whitespace-nowrap">{label}</span>
      ) : (
        <>
          <label htmlFor={ids.color} className="sr-only">
            Chip color
          </label>
          <select
            id={ids.color}
            className={`${FIELD} text-left`}
            value={chip.color}
            onChange={(event) => {
              onColorChange(ChipColorSchema.parse(event.target.value));
            }}
          >
            {availableColors(usedColors, chip.color).map((color) => (
              <option key={color} value={color}>
                {STACK_LABELS[color]}
              </option>
            ))}
          </select>
        </>
      )}
      <label htmlFor={ids.count} className="sr-only">
        {countLabel}
      </label>
      <DraftInput
        id={ids.count}
        className={`${FIELD} text-center`}
        inputMode="numeric"
        value={chip.count}
        format={String}
        parse={parseCount}
        onValueChange={onCountChange}
      />
      <span className="text-center text-text-muted" aria-hidden="true">
        ×
      </span>
      <label htmlFor={ids.value} className="sr-only">
        {valueLabel}
      </label>
      <DraftInput
        id={ids.value}
        className={`${FIELD} text-center`}
        inputMode="decimal"
        value={chip.value}
        format={String}
        parse={parseDecimal}
        onValueChange={onValueChange}
      />
      <button
        type="button"
        // 44px touch target in a 36px column; it overlaps only the gap beside it.
        className="-mx-1 size-11 rounded-sm border-0 bg-transparent text-3xl leading-none text-text-muted disabled:opacity-45"
        aria-label={`Remove ${label}`}
        disabled={!canRemove}
        onClick={onRemove}
      >
        ×
      </button>
      <div className="col-start-2 -col-end-1 -mt-1 text-sm text-text-muted">
        {`${String(chip.count)} chips worth ${money(chip.count * chip.value)}`}
      </div>
    </div>
  );
}
