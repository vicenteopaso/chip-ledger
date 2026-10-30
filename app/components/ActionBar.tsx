"use client";

import { type ReactNode, useEffect, useState } from "react";

export type ActionBarProps = {
  children: ReactNode;
  /** A row under the buttons, still inside the bar: the copyright and the theme button. */
  footer?: ReactNode;
};

/** The fixed bottom bar holding each step's main actions (REQ-0001-02). */
export function ActionBar({ children, footer }: ActionBarProps) {
  const [compact, setCompact] = useState(false);

  // The bar shrinks once the page is scrolled, giving the content the room back.
  useEffect(() => {
    const update = () => {
      setCompact(window.scrollY > 8);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <div
      data-compact={compact}
      className="action-bar fixed inset-x-0 bottom-0 border-t short:static border-border bg-bar px-4 pt-2 backdrop-blur-bar"
    >
      <div className="action-bar-buttons mx-auto flex max-w-app gap-2.5">{children}</div>
      {footer && (
        <div className="action-bar-footer mx-auto flex min-h-7 max-w-app items-center justify-between gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}
