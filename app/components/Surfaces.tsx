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
