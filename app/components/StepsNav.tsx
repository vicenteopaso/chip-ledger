import { SCREENS, type Screen } from "@/lib/game";

const LABELS: Record<Screen, string> = {
  setup: "Setup",
  table: "Table",
  cashout: "Cash out",
  settle: "Settle",
};

export type StepsNavProps = { current: Screen; onSelect: (screen: Screen) => void };

/**
 * The four steps; any step can be opened at any time (REQ-0001-01). Earlier steps show a check
 * mark and say "(done)" to assistive technology, not only a border color (REQ-0002-04).
 */
export function StepsNav({ current, onSelect }: StepsNavProps) {
  const currentIndex = SCREENS.indexOf(current);
  return (
    <nav aria-label="Steps" className="mt-1 mb-1.5 grid grid-cols-4 gap-1.5">
      {SCREENS.map((screen, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;
        const label = `${String(index + 1)} ${LABELS[screen]}`;
        const tone = isCurrent
          ? "border-accent font-semibold text-text"
          : isDone
            ? "border-step-done text-text-muted"
            : "border-border text-text-muted";
        return (
          <button
            key={screen}
            type="button"
            // 44px touch target; the negative margin keeps the prototype's spacing below.
            className={`-mb-4 flex min-h-11 items-start gap-1 border-x-0 border-t-3 border-b-0 bg-transparent pt-1.5 text-left text-xs ${tone}`}
            aria-current={isCurrent ? "step" : undefined}
            // The visible text plus "(done)", so the state is not shown by color alone.
            aria-label={isDone ? `${label} (done)` : undefined}
            onClick={() => {
              onSelect(screen);
            }}
          >
            {isDone && <span aria-hidden="true">✓</span>}
            {label}
          </button>
        );
      })}
    </nav>
  );
}
