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
    <nav aria-label="Steps">
      <ol className="grid grid-cols-4">
        {SCREENS.map((screen, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          const label = `${String(index + 1)} ${LABELS[screen]}`;
          return (
            <li key={screen} className="relative flex justify-center">
              {index > 0 && (
                // The line from the previous circle's center to this one's.
                <span
                  aria-hidden="true"
                  className={`step-line absolute top-5 right-1/2 h-0.5 w-full ${index <= currentIndex ? "bg-accent" : "bg-border-control"}`}
                />
              )}
              <button
                type="button"
                className={`relative flex min-h-11 w-full min-w-0 flex-col items-center gap-1.5 group rounded-md border-0 bg-transparent px-0.5 pt-1 pb-1.5 text-md leading-tight ${state === "current" ? "font-bold text-text" : "text-text-muted"}`}
                aria-current={state === "current" ? "step" : undefined}
                // A done step shows a check mark, so its name adds the number and "(done)" to the
                // visible label. Other steps are named by their visible number and label.
                aria-label={state === "done" ? `${label} (done)` : undefined}
                onClick={() => {
                  onSelect(screen);
                }}
              >
                {/* Above the connecting lines, which belong to the next item. */}
                <span
                  aria-hidden={state === "done"}
                  data-state={state}
                  className={`step-dot relative z-10 grid size-8 place-items-center rounded-full border-2 text-md font-bold ${DOT[state]}`}
                >
                  {state === "done" ? <CheckMark /> : index + 1}
                </span>{" "}
                <span className="whitespace-nowrap underline-offset-4 group-hover:text-text group-hover:underline">
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
