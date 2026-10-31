"use client";

import { type ReactNode, useEffect, useState } from "react";

import { BrandMark } from "@/app/components/BrandMark";

export type AppHeaderProps = {
  /** The step navigation, shown under the wordmark. */
  children: ReactNode;
  /** A control at the end of the wordmark's row, such as Share (SPEC-0003 REQ-0003-02). It is hidden while the header is small. */
  action?: ReactNode;
};

/**
 * The page's banner on every step: the chip mark and "Chip Ledger", then the steps. It sits in
 * the same place on every step, so step changes don't shift the content (REQ-0002-28). It stays at
 * the top of the screen while the page scrolls, and shrinks once the page is scrolled so the brand
 * stays in view and the content keeps the room; the action (Share) is left out while it is small.
 */
export function AppHeader({ children, action }: AppHeaderProps) {
  const [compact, setCompact] = useState(false);

  // Shrink after a short scroll and grow back only near the top, so it cannot flicker at the edge.
  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setCompact((was) => (was ? y > 8 : y > 48));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <header
      data-compact={compact}
      className="app-header sticky top-0 z-30 border-b border-transparent bg-bg short:static"
    >
      <div className="app-header-inner mx-auto max-w-app px-4 pt-5 pb-2">
        {/* Sized to balance the step title below it (REQ-0002-28). */}
        <div className="app-header-brand mb-6 flex items-center justify-between gap-3">
          <p className="app-header-title flex items-center gap-3 text-4xl leading-display font-extrabold tracking-display">
            <BrandMark className="app-header-mark size-12 flex-none" />
            Chip Ledger
          </p>
          {!compact && action}
        </div>
        {children}
      </div>
    </header>
  );
}
