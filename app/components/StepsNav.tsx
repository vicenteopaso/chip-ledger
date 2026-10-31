import { SCREENS, type Screen } from "@/lib/game";

const LABELS: Record<Screen, string> = {
  setup: "Setup",
  table: "Table",
  cashout: "Cash out",
  settle: "Settle",
};

export type StepsNavProps = { current: Screen; onSelect: (screen: Screen) => void };

// Hover marks the circle and the label only, never a box: the connecting line runs behind it.
const DOT = {
  done: "border-accent bg-accent text-accent-ink group-hover:ring-4 group-hover:ring-accent-soft",
  current: "border-accent bg-accent text-accent-ink ring-4 ring-accent-soft",
  upcoming:
    "border-border-control bg-surface text-text-muted group-hover:border-accent group-hover:text-accent",
} as const;

function CheckMark() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

/**
 * The four steps as a progress stepper; any step can be opened at any time (REQ-0001-01).
 * Numbered circles joined by a line: done steps show a check mark, the current step is filled
 * with a halo, later steps are outlined (REQ-0002-27). Each name says the number and, for done
 * steps, "(done)", so the state is never shown by color alone (REQ-0002-04).
 */
export function StepsNav({ current, onSelect }: StepsNavProps) {
  const currentIndex = SCREENS.indexOf(current);
  return (
    <nav aria-label="Steps" className="relative">
      {/* One track from the first circle's center to the last, filled up to the current step.
          The circles sit above it. */}
      <span
        aria-hidden="true"
        className="step-line absolute inset-x-4 top-4.75 h-0.5 bg-border-control"
      />
      <span
        aria-hidden="true"
        data-step={currentIndex}
        className="step-line step-progress absolute top-4.75 left-4 h-0.5 bg-accent"
      />
      {/* Full width: the first step sits flush left, the last flush right. The end buttons are
          48 px and the middle ones 64 px, so with the free space shared between them the four
          circles are evenly spaced. */}
      <ol className="flex items-start justify-between">
        {SCREENS.map((screen, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          const label = `${String(index + 1)} ${LABELS[screen]}`;
          const align =
            index === 0
              ? "w-12 items-start"
              : index === SCREENS.length - 1
                ? "w-12 items-end"
                : "w-16 items-center";
          return (
            <li key={screen} className="flex">
              <button
                type="button"
                className={`group relative flex min-h-11 flex-none flex-col gap-1.5 rounded-md border-0 bg-transparent pt-1 pb-1.5 text-md leading-tight ${align} ${state === "current" ? "font-bold text-text" : "text-text-muted"}`}
                aria-current={state === "current" ? "step" : undefined}
                // A done step shows a check mark, so its name adds the number and "(done)" to the
                // visible label. Other steps are named by their visible number and label.
                aria-label={state === "done" ? `${label} (done)` : undefined}
                onClick={() => {
                  onSelect(screen);
                }}
              >
                {/* Above the track. */}
                <span
                  aria-hidden={state === "done"}
                  data-state={state}
                  className={`step-dot relative z-10 grid size-8 place-items-center rounded-full border-2 text-md font-bold ${DOT[state]}`}
                >
                  {state === "done" ? <CheckMark /> : index + 1}
                </span>{" "}
                <span className="step-label whitespace-nowrap underline-offset-4 group-hover:text-text group-hover:underline">
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
