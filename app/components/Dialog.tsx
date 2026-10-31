"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/app/components/Button";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * What Tab can land on, in order. A group of radio buttons is one stop (its checked button), so
 * the last stop is not always the last radio in the page.
 */
function tabStops(root: HTMLElement): HTMLElement[] {
  const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  return all.filter((item) => {
    if (!(item instanceof HTMLInputElement) || item.type !== "radio") return true;
    const group = all.filter(
      (other): other is HTMLInputElement =>
        other instanceof HTMLInputElement && other.type === "radio" && other.name === item.name,
    );
    const stop = group.find((radio) => radio.checked) ?? group[0];
    return item === stop;
  });
}

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** The dialog's name and visible heading. */
  title: string;
  children: ReactNode;
};

/**
 * A modal sheet (SPEC-0003 REQ-0003-28): labelled by its heading, focus moves in on open and stays
 * inside (a radio group counts as one Tab stop), `Esc` or **Close** closes it, and focus returns
 * to whatever opened it. Used by the Share and Games sheets.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();
    return () => {
      opener.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = panelRef.current ? tabStops(panelRef.current) : [];
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) return;
    // Keep Tab inside the dialog: from the last control to the first, and back.
    if (
      event.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === panelRef.current ||
        document.activeElement === headingRef.current)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-text/50 p-3 sm:items-center">
      {/* Keys are handled on the dialog so Tab and Esc work wherever focus is inside it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-5"
        onKeyDown={onKeyDown}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="text-3xl leading-display font-extrabold tracking-display"
          >
            {title}
          </h2>
          <Button variant="link" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
