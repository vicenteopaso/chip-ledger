import type { ReactNode } from "react";

type SurfaceProps = {
  children: ReactNode;
  /** Layout only (flex, grid, gaps); the look comes from the component. */
  className?: string;
  "aria-labelledby"?: string;
};

const CARD = "rounded-xl border border-border bg-surface p-4";
const ROW = "border-b border-border py-3";

/** Grouped content such as a player's Cash out card or a payment (REQ-0002-20). */
export function Card({
  as: Tag = "div",
  className = "",
  children,
  ...aria
}: SurfaceProps & { as?: "div" | "section" | "li" }) {
  return (
    <Tag className={`${CARD} ${className}`} {...aria}>
      {children}
    </Tag>
  );
}

/** One line of a list: Setup chip rows, Table players, results (REQ-0002-20). */
export function ListRow({
  as: Tag = "div",
  className = "",
  children,
  ...aria
}: SurfaceProps & { as?: "div" | "li" }) {
  return (
    <Tag className={`${ROW} ${className}`} {...aria}>
      {children}
    </Tag>
  );
}

/**
 * A panel of list rows (Table players, Settle results): one surface with dividers between the
 * rows and none under the last one.
 */
export function ListPanel({
  as: Tag = "div",
  className = "",
  children,
  ...aria
}: SurfaceProps & { as?: "div" | "ul" }) {
  return (
    <Tag
      className={`rounded-xl border border-border bg-surface px-4 *:last:border-b-0 ${className}`}
      {...aria}
    >
      {children}
    </Tag>
  );
}

/**
 * The felt panel behind a screen's most important number, at most once per screen (REQ-0005-03).
 * The same deep green in both themes, with its own text colors.
 */
export function FeltPanel({ className = "", children, ...aria }: SurfaceProps) {
  return (
    <section className={`rounded-2xl bg-felt px-5 py-4.5 text-felt-ink ${className}`} {...aria}>
      {children}
    </section>
  );
}
