"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from "react";

import { Button } from "@/app/components/Button";
import { QrCode } from "@/app/components/QrCode";
import { Hint } from "@/app/components/Typography";
import { LINK_HELP, LINK_KINDS, type LinkKind, RETENTION_NOTICE } from "@/lib/share-links";

export type EditCodeState =
  | { kind: "hidden" }
  | { kind: "working" }
  | { kind: "shown"; code: string }
  | { kind: "failed"; text: string };

export type ShareSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Before the game is shared there is no link yet: the sheet asks first (REQ-0003-22). */
  stage: "intro" | "creating" | "ready";
  problem: string | null;
  onCreate: () => void;
  /** The chosen kind, and the link for it, or `null` when this device cannot offer that kind. */
  kind: LinkKind;
  onKindChange: (kind: LinkKind) => void;
  link: string | null;
  modules: readonly (readonly boolean[])[] | null;
  /** Which kinds this device holds a key for. */
  available: Record<LinkKind, boolean>;
  copied: boolean;
  onCopy: () => void;
  /** Present only where the browser has a share menu. */
  onNativeShare?: () => void;
  /** Present only for someone who can edit. */
  editCode?: { state: EditCodeState; onShow: () => void };
};

const KIND_LABEL: Record<LinkKind, string> = { watch: "Watch only", edit: "Can edit" };
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

/** A code written with spaces, so a screen reader says the letters one by one. */
const spaced = (code: string) => code.split("").join(" ");

/**
 * The Share dialog (SPEC-0003 REQ-0002, -03, -22, -28): a QR code first, the same link as text with
 * Copy link, the device's share menu where there is one, what is kept and for how long, and last
 * the Watch only | Can edit switch, which is Watch only each time the sheet opens. Focus moves in
 * on open, stays inside, and returns to the opener on close; Esc closes.
 */
export function ShareSheet(props: ShareSheetProps) {
  const { open, onClose, stage, kind, available } = props;
  const titleId = useId();
  const nameId = useId();
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
    // Keep Tab inside the dialog: from the last control to the first, and back (REQ-0003-28).
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

  const qrLabel = props.link
    ? `QR code for the ${KIND_LABEL[kind].toLowerCase()} link. The same link is written below; use Copy link to share it as text.`
    : "";

  let body: ReactNode;
  if (stage === "intro" || stage === "creating") {
    body = (
      <>
        <p className="mb-3">{RETENTION_NOTICE}</p>
        <Hint>Nothing is sent until you press the button below.</Hint>
        {props.problem && (
          <p role="alert" className="mb-3 font-semibold text-danger">
            {props.problem}
          </p>
        )}
        <Button
          variant="primary"
          aria-disabled={stage === "creating"}
          onClick={() => {
            if (stage === "intro") props.onCreate();
          }}
        >
          {stage === "creating" ? "Creating the link…" : "Create the link"}
        </Button>
      </>
    );
  } else {
    body = (
      <>
        {props.link && props.modules ? (
          <>
            <QrCode modules={props.modules} label={qrLabel} />
            <p className="mt-4 text-center text-md break-all select-all" data-testid="share-link">
              {props.link}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={props.onCopy}>
                Copy link
              </Button>
              {props.onNativeShare && (
                <Button variant="secondary" onClick={props.onNativeShare}>
                  Share
                </Button>
              )}
            </div>
            <p role="status" className="mt-2 min-h-6 text-center text-md text-text-muted">
              {props.copied ? "Link copied." : ""}
            </p>
          </>
        ) : (
          <p className="mb-3 rounded-md border border-border bg-sunk p-3">
            {kind === "watch"
              ? "This device doesn't have the watch link. Only the device that started sharing can show it. You can still share the edit link below."
              : "A watcher can't offer an edit link. Ask an editor, or use the edit code."}
          </p>
        )}
        <p className="mt-3 text-md text-text-muted">{RETENTION_NOTICE}</p>
        {props.editCode && <EditCodeBlock {...props.editCode} />}
        <fieldset className="mt-5">
          <legend className="mb-2 font-semibold" id={nameId}>
            Who can use this link
          </legend>
          <div role="radiogroup" aria-labelledby={nameId} className="flex flex-col gap-3">
            {LINK_KINDS.map((option) => (
              <label key={option} className="flex items-start gap-3 text-md">
                <input
                  type="radio"
                  name="share-kind"
                  className="mt-px size-5 flex-none accent-accent"
                  value={option}
                  checked={kind === option}
                  onChange={() => {
                    props.onKindChange(option);
                  }}
                />
                <span>
                  <span className="block font-semibold">{KIND_LABEL[option]}</span>
                  {LINK_HELP[option]}
                  {!available[option] && (
                    <span className="block text-text-muted">
                      {option === "watch"
                        ? " Not available on this device."
                        : " Needs edit access."}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </>
    );
  }

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
            Share this game
          </h2>
          <Button variant="link" onClick={onClose}>
            Close
          </Button>
        </div>
        {body}
      </div>
    </div>
  );
}

function EditCodeBlock({ state, onShow }: { state: EditCodeState; onShow: () => void }) {
  return (
    <section className="mt-5 rounded-md border border-border bg-sunk p-3">
      <h3 className="mb-1 font-semibold">Edit code</h3>
      <p className="mb-2 text-md text-text-muted">
        Someone watching can type this code to become an editor on their device. It works for 10
        minutes, and a new code replaces the old one.
      </p>
      {state.kind === "shown" && (
        <p
          className="mb-2 text-4xl font-extrabold tracking-widest"
          aria-label={`Edit code: ${spaced(state.code)}`}
        >
          {state.code}
        </p>
      )}
      {state.kind === "failed" && (
        <p role="alert" className="mb-2 font-semibold text-danger">
          {state.text}
        </p>
      )}
      <Button
        variant="secondary"
        aria-disabled={state.kind === "working"}
        onClick={() => {
          if (state.kind !== "working") onShow();
        }}
      >
        {state.kind === "shown" ? "New code" : "Show edit code"}
      </Button>
    </section>
  );
}
