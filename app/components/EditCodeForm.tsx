"use client";

import { useId, useState } from "react";

import { Button } from "@/app/components/Button";
import { DraftInput } from "@/app/components/DraftInput";
import { FIELD } from "@/app/components/Field";
import { ReadOnlyContext } from "@/app/components/ReadOnly";
import { CODE_ALPHABET, CODE_LENGTH } from "@/lib/shared-game";

export type EditCodeFormProps = {
  /** Checks a code with the server: the container makes the request (REQ-0003-09). */
  onSubmit: (
    code: string,
  ) => Promise<{ kind: "upgraded"; editKey: string } | { kind: "refused" | "locked" | "error" }>;
  /** Called with this device's new edit key once the code is accepted. */
  onUpgraded: (editKey: string) => void;
};

const MESSAGES = {
  refused: "That code didn't work.",
  locked: "Too many tries. Wait a minute and try again.",
  error: "The code couldn't be checked. Check your connection and try again.",
} as const;

const NOT_CODE = new RegExp(`[^${CODE_ALPHABET}]`, "g");
const clean = (text: string) => text.toUpperCase().replace(NOT_CODE, "");

/**
 * Where a watcher types the current edit code to become an editor on this device. Wrong, old and
 * replaced codes all get the same message, so nobody learns which was which (REQ-0003-09).
 */
export function EditCodeForm({ onSubmit, onUpgraded }: EditCodeFormProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        variant="link"
        onClick={() => {
          setOpen(true);
        }}
      >
        I have an edit code
      </Button>
    );
  }

  const submit = async () => {
    if (working) return;
    if (code.length !== CODE_LENGTH) {
      setMessage(`An edit code has ${String(CODE_LENGTH)} letters and numbers.`);
      return;
    }
    setWorking(true);
    setMessage(null);
    const outcome = await onSubmit(code);
    setWorking(false);
    if (outcome.kind === "upgraded") {
      onUpgraded(outcome.editKey);
      return;
    }
    setMessage(MESSAGES[outcome.kind]);
  };

  // A watcher's page is read-only, but this is where a watcher asks to edit, so it never is.
  return (
    <ReadOnlyContext value={false}>
      <div className="mb-3 rounded-md border border-border bg-surface p-3">
        <label htmlFor={fieldId} className="mb-1 block text-md font-semibold text-text-muted">
          Edit code
        </label>
        <div className="flex gap-3">
          <DraftInput
            id={fieldId}
            className={`${FIELD} w-40 px-3 text-xl font-semibold tracking-widest uppercase`}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={CODE_LENGTH}
            aria-invalid={message !== null}
            aria-describedby={message ? `${fieldId}-message` : undefined}
            value={code}
            format={(value) => value}
            parse={clean}
            filter={clean}
            onValueChange={(value) => {
              setCode(value);
              setMessage(null);
            }}
          />
          <Button
            variant="secondary"
            aria-disabled={working}
            onClick={() => {
              void submit();
            }}
          >
            Join as editor
          </Button>
        </div>
        {message && (
          <p
            id={`${fieldId}-message`}
            role="alert"
            className="mt-2 text-md font-semibold text-danger"
          >
            {message}
          </p>
        )}
      </div>
    </ReadOnlyContext>
  );
}
