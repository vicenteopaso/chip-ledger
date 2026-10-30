export type StepperProps = {
  /** Names the group and the value, for example "Number of players" or "Buy-ins for Ana". */
  label: string;
  value: number;
  min: number;
  max?: number;
  decrementLabel: string;
  incrementLabel: string;
  onStep: (delta: 1 | -1) => void;
  /** Stretches the value to fill the row (Setup); otherwise the stepper is compact (Table). */
  stretch?: boolean;
};

const STEP_BUTTON =
  "press size-11.5 flex-none rounded-lg border-0 bg-transparent text-3xl font-extrabold hover:not-aria-disabled:bg-surface-hover aria-disabled:text-disabled-ink";

/**
 * − value + in one bordered group (REQ-0002-19). A limit is marked with `aria-disabled`, not
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
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center rounded-lg border-control border-border bg-surface ${stretch ? "w-full" : ""}`}
    >
      <button
        type="button"
        className={STEP_BUTTON}
        aria-label={decrementLabel}
        aria-disabled={value <= min}
        onClick={() => {
          onStep(-1);
        }}
      >
        −
      </button>
      <output
        className={`min-w-7 text-center text-2xl font-extrabold ${stretch ? "flex-1" : ""}`}
        aria-label={label}
        aria-live="off"
      >
        {value}
      </output>
      <button
        type="button"
        className={STEP_BUTTON}
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
