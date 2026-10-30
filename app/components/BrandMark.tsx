export type BrandMarkProps = { className?: string };

/** One chip of the mark: a body, eight edge spots, and an inner ring. */
const CHIPS = [
  { cx: 10.5, cy: 11, body: "fill-chip-blue" },
  { cx: 21.5, cy: 11, body: "fill-chip-green" },
  { cx: 16, cy: 21.5, body: "fill-chip-red" },
] as const;

/**
 * The Chip Ledger mark: three casino chips (blue, green, red) in a cluster. Each chip is
 * outlined in the page color, so overlaps read in both themes. The favicon (`app/icon.svg`)
 * is the same drawing. Decorative: the wordmark beside it names the app (REQ-0002-29).
 */
export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {CHIPS.map(({ cx, cy, body }) => (
        <g key={body}>
          <circle cx={cx} cy={cy} r="9.5" strokeWidth="1.3" className={`${body} stroke-bg`} />
          <circle
            cx={cx}
            cy={cy}
            r="7.6"
            fill="none"
            strokeWidth="2.6"
            strokeDasharray="2.39 3.58"
            strokeDashoffset="1.19"
            className="stroke-chip-spot"
          />
          <circle
            cx={cx}
            cy={cy}
            r="4.75"
            fill="none"
            strokeWidth="1.05"
            className="stroke-chip-spot"
          />
        </g>
      ))}
    </svg>
  );
}
