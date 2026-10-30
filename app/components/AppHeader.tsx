import type { ReactNode } from "react";

import { BrandMark } from "@/app/components/BrandMark";

export type AppHeaderProps = {
  /** The step navigation, shown under the wordmark. */
  children: ReactNode;
};

/**
 * The page's banner on every step: the chip mark and "Chip Ledger", then the steps. It sits in
 * the same place on every step, so step changes don't shift the content (REQ-0002-28).
 */
export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="mx-auto max-w-app px-4 pt-5">
      {/* Sized to balance the step title below it (REQ-0002-28). */}
      <p className="mb-6 flex items-center gap-3 text-4xl leading-display font-extrabold tracking-display">
        <BrandMark className="size-12 flex-none" />
        Chip Ledger
      </p>
      {children}
    </header>
  );
}
