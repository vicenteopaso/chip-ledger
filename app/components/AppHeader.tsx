import type { ReactNode } from "react";

import { BrandMark } from "@/app/components/BrandMark";

export type AppHeaderProps = {
  /** The step navigation, shown under the wordmark. */
  children: ReactNode;
  /** A control at the end of the wordmark's row, such as Share (SPEC-0003 REQ-0003-02). */
  action?: ReactNode;
};

/**
 * The page's banner on every step: the chip mark and "Chip Ledger", then the steps. It sits in
 * the same place on every step, so step changes don't shift the content (REQ-0002-28).
 */
export function AppHeader({ children, action }: AppHeaderProps) {
  return (
    <header className="mx-auto max-w-app px-4 pt-5">
      {/* Sized to balance the step title below it (REQ-0002-28). */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="flex items-center gap-3 text-4xl leading-display font-extrabold tracking-display">
          <BrandMark className="size-12 flex-none" />
          Chip Ledger
        </p>
        {action}
      </div>
      {children}
    </header>
  );
}
