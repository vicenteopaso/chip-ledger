"use client";

import { type KeyboardEvent, useEffect, useId, useRef } from "react";

import { Button } from "@/app/components/Button";

export type ConfirmInlineProps = {
  /** The destructive action's button, shown while closed. */
  triggerLabel: string;
  /** The question shown in place of the trigger while open. */
  message: string;
  confirmLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/**
 * A destructive action that asks in place before it runs (REQ-0002-11). Opening moves focus to
 * Cancel, the safe choice; Cancel or `Esc` closes it and returns focus to the trigger.
 */
export function ConfirmInline({
  triggerLabel,
  message,
  confirmLabel,
  open,
  onOpenChange,
  onConfirm,
}: ConfirmInlineProps) {
  const messageId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  /** Set when the person opened or cancelled here, so focus never moves on first render. */
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (open ? cancelRef : triggerRef).current?.focus();
  }, [open]);

  const setOpen = (next: boolean) => {
    moveFocus.current = true;
    onOpenChange(next);
  };

  // On both buttons, the only focusable elements while open, so `Esc` works from either.
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") setOpen(false);
  };

  if (!open) {
    return (
      <Button
        ref={triggerRef}
        variant="danger"
        onClick={() => {
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-labelledby={messageId}
      className="rounded-xl border-control border-danger bg-surface p-4"
    >
      <p id={messageId} className="mb-3 font-semibold">
        {message}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          ref={cancelRef}
          variant="secondary"
          onKeyDown={closeOnEscape}
          onClick={() => {
            setOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button variant="danger" onKeyDown={closeOnEscape} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
