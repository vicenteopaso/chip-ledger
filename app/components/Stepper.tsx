import { FIELD_BOX } from "@/app/components/Field";
import { useReadOnly } from "@/app/components/ReadOnly";

export type StepperProps = {
  /** Names the group and the value, for example "Number of players" or "Buy-ins for Ana". */
  label: string;
  value: number;
  min: number;
  max?: number;
  decrementLabel: string;
  incrementLabel: string;
  onStep: (delta: 1 | -1) => void;
  /** Stretches the value to fill a field box (Setup); otherwise free-standing round keys (Table). */
  stretch?: boolean;
};

// Setup: round keys in the soft button tint, inset in the field box (REQ-0002-31).
const BOXED_KEY =
  "press size-10 flex-none rounded-full border-0 bg-accent-soft text-2xl leading-none font-semibold text-text hover:not-aria-disabled:bg-accent-soft-hover aria-disabled:bg-disabled-bg aria-disabled:text-disabled-ink";
// Table: free-standing 44 px circles, − outlined and + in brass (REQ-0005-15).
const ROUND_KEY =
  "press size-11 flex-none rounded-full border-control text-2xl leading-none font-semibold aria-disabled:border-transparent aria-disabled:bg-disabled-bg aria-disabled:text-disabled-ink";
const KEYS = {
  boxed: { decrement: BOXED_KEY, increment: BOXED_KEY },
  round: {
    decrement: `${ROUND_KEY} border-border-control bg-transparent text-text hover:not-aria-disabled:bg-surface-hover`,
    increment: `${ROUND_KEY} border-transparent bg-accent text-accent-ink hover:not-aria-disabled:bg-accent-hover`,
  },
} as const;

/**
 * − value + in one box that looks like the other fields (REQ-0002-19, REQ-0002-31). A limit is marked with `aria-disabled`, not
 * `disabled`, so keyboard focus stays on the button that reached it (REQ-0002-13). The value is
 * not a live region: the page's announcer says what changed (REQ-0002-07).
 */
export function Stepper({
  label,
  value,
  min,
  max = Number.POSITIVE_INFINITY,
  decrementLabel,
  incrementLabel,
  onStep,
  stretch = false,
}: StepperProps) {
  const readOnly = useReadOnly();
  // A watcher sees the number alone: no buttons that do nothing (REQ-0003-06).
  if (readOnly) {
    return (
      <div
        role="group"
        aria-label={label}
        className={`flex items-center px-3 ${FIELD_BOX} ${stretch ? "w-full" : "w-fit"}`}
      >
        <output
          className={`min-w-7 text-center text-2xl font-semibold ${stretch ? "flex-1" : ""}`}
          aria-label={label}
          aria-live="off"
        >
          {value}
        </output>
      </div>
    );
  }
  const keys = KEYS[stretch ? "boxed" : "round"];
  return (
    <div
      role="group"
      aria-label={label}
      className={
        stretch ? `flex w-full items-center gap-1 px-0.5 ${FIELD_BOX}` : "flex items-center gap-2"
      }
    >
      <button
        type="button"
        className={keys.decrement}
        aria-label={decrementLabel}
        aria-disabled={value <= min}
        onClick={() => {
          onStep(-1);
        }}
      >
        −
      </button>
      <output
        className={`min-w-7 text-center text-2xl font-semibold ${stretch ? "flex-1" : ""}`}
        aria-label={label}
        aria-live="off"
      >
        {value}
      </output>
      <button
        type="button"
        className={keys.increment}
        aria-label={incrementLabel}
        aria-disabled={value >= max}
        onClick={() => {
          onStep(1);
        }}
      >
        +
      </button>
    </div>
  );
}
