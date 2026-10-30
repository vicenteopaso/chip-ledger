export type BrandMarkProps = { className?: string };

/**
 * The Chip Ledger mark: one casino chip in the accent color, with eight edge spots and an inner
 * ring in the page color, so it reads in both themes. The favicon (`app/icon.svg`) is the same
 * drawing in the light theme's colors. Decorative: the wordmark beside it names the app.
 */
export function BrandMark({ className = "" }: BrandMarkProps) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="15" className="fill-accent" />
      <circle
        cx="16"
        cy="16"
        r="12.5"
        fill="none"
        strokeWidth="4"
        strokeDasharray="4.3 5.52"
        strokeDashoffset="2.15"
        className="stroke-bg"
      />
      <circle cx="16" cy="16" r="7.5" fill="none" strokeWidth="1.75" className="stroke-bg" />
    </svg>
  );
}
