export type BrandMarkProps = { className?: string };

/**
 * The Chip Ledger mark: one brass casino chip, drawn as a rim, eight edge spots, and a solid
 * center, in the brass token so it follows the theme. The favicon (`app/icon.svg`) and the
 * home-screen icon are the same drawing on the dark room color. Decorative: the wordmark beside
 * it names the app (REQ-0005-11).
 */
export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14.75" fill="none" strokeWidth="1.85" className="stroke-accent" />
      <circle
        cx="16"
        cy="16"
        r="14.75"
        fill="none"
        strokeWidth="3.7"
        strokeDasharray="3.7 7.88"
        className="stroke-accent"
      />
      <circle cx="16" cy="16" r="6.75" className="fill-accent" />
    </svg>
  );
}
