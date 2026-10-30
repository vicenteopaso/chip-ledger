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
  /** Stretches the value to fill the row (Setup); otherwise the stepper is compact (Table). */
  stretch?: boolean;
};

// Round keys in the soft button tint, inset in the field box (REQ-0002-31).
const STEP_BUTTON =
  "press size-10 flex-none rounded-full border-0 bg-accent-soft text-2xl leading-none font-extrabold text-text hover:not-aria-disabled:bg-accent-soft-hover aria-disabled:bg-disabled-bg aria-disabled:text-disabled-ink";

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
          className={`min-w-7 text-center text-2xl font-extrabold ${stretch ? "flex-1" : ""}`}
          aria-label={label}
          aria-live="off"
        >
          {value}
        </output>
      </div>
    );
  }
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center gap-1 px-0.5 ${FIELD_BOX} ${stretch ? "w-full" : "w-fit"}`}
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
