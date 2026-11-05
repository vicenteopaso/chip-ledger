import { SCREENS, type Screen } from "@/lib/game";

const LABELS: Record<Screen, string> = {
  setup: "Setup",
  table: "Table",
  cashout: "Cash out",
  settle: "Settle",
};

export type StepsNavProps = { current: Screen; onSelect: (screen: Screen) => void };

// Bars fill like a progress bar: brass up to the current step, the control border after it, all
// at least 3:1 against the page (REQ-0005-04). The current step's bar is thicker.
const BAR = {
  done: "h-0.75 bg-accent",
  current: "h-1 bg-accent",
  upcoming: "h-0.75 bg-border-control",
} as const;

function CheckMark() {
  return (
    <svg
      className="mt-px size-3.5 flex-none text-accent-text"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/**
 * The four steps; any step can be opened at any time (REQ-0001-01). Each is a bar and its name:
 * done steps add a check mark, the current step has a thicker bar and a bold name (REQ-0005-13).
 * Each button's name says the number and, for done steps, "(done)", so the state is never shown
 * by color alone (REQ-0002-04). Once the header shrinks, only the bars show.
 */
export function StepsNav({ current, onSelect }: StepsNavProps) {
  const currentIndex = SCREENS.indexOf(current);
  return (
    <nav aria-label="Steps">
      <ol className="grid grid-cols-4 gap-2">
        {SCREENS.map((screen, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          const label = `${String(index + 1)} ${LABELS[screen]}`;
          return (
            <li key={screen} className="flex">
              <button
                type="button"
                className={`group flex min-h-11 flex-1 flex-col justify-start gap-2 rounded-sm border-0 bg-transparent pt-1 pb-1.5 text-left text-md leading-tight ${state === "current" ? "font-semibold text-text" : "text-text-muted"}`}
                aria-current={state === "current" ? "step" : undefined}
                // The number is not shown, so every name adds it; done steps add "(done)" too.
                aria-label={state === "done" ? `${label} (done)` : label}
                onClick={() => {
                  onSelect(screen);
                }}
              >
                <span
                  aria-hidden="true"
                  data-state={state}
                  className={`step-bar block w-full rounded-full ${BAR[state]}`}
                />
                <span className="step-label flex min-w-0 items-start gap-1.5 underline-offset-4 group-hover:text-text group-hover:underline">
                  {/* At 320 px a long name wraps under itself instead of running into the next step. */}
                  {state === "done" && <CheckMark />}
                  {LABELS[screen]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
