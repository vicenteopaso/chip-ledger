import type { ReactNode } from "react";

export type ActionBarProps = {
  children: ReactNode;
  /** A row under the buttons, still inside the bar: the copyright and the theme button. */
  footer?: ReactNode;
};

/** The fixed bottom bar holding each step's main actions (REQ-0001-02). */
export function ActionBar({ children, footer }: ActionBarProps) {
  return (
    <div className="action-bar fixed inset-x-0 bottom-0 border-t border-border bg-bar px-4 pt-3 backdrop-blur-bar">
      <div className="mx-auto flex max-w-app gap-2.5">{children}</div>
      {footer && (
        <div className="mx-auto mt-1 flex min-h-11 max-w-app items-center justify-between gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}
