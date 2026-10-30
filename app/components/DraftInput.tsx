"use client";

import { type InputHTMLAttributes, type Ref, useState } from "react";

import { useReadOnly } from "@/app/components/ReadOnly";

export type DraftInputProps<T> = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: T;
  ref?: Ref<HTMLInputElement>;
  format: (value: T) => string;
  parse: (text: string) => T;
  onValueChange: (value: T) => void;
  /** Removes characters the field does not accept, as they are typed or pasted (numbers only). */
  filter?: (text: string) => string;
};

/**
 * A text input bound to a parsed value that keeps the person's in-progress text ("2.", "0,")
 * instead of reformatting it on every keystroke. The text is replaced only when the value
 * changes from outside (for example a reset or a photo count).
 */
export function DraftInput<T>({
  value,
  format,
  parse,
  onValueChange,
  filter,
  onFocus,
  onBlur,
  ...props
}: DraftInputProps<T>) {
  const readOnly = useReadOnly();
  const [draft, setDraft] = useState(() => format(value));
  const [seen, setSeen] = useState(value);
  const [focused, setFocused] = useState(false);
  if (!Object.is(seen, value)) {
    setSeen(value);
    // A change from elsewhere must not replace what the person is typing (SPEC-0003 REQ-0003-12);
    // it is taken in when they leave the field.
    if (!focused && !Object.is(parse(draft), value)) setDraft(format(value));
  }
  return (
    <input
      {...props}
      // Read-only, not disabled, so a watcher can still focus, select, and hear the value.
      readOnly={readOnly || props.readOnly}
      aria-readonly={readOnly || props.readOnly ? true : undefined}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        if (!Object.is(parse(draft), value)) setDraft(format(value));
        onBlur?.(event);
      }}
      onChange={(event) => {
        const text = filter ? filter(event.target.value) : event.target.value;
        const next = parse(text);
        setDraft(text);
        setSeen(next);
        onValueChange(next);
      }}
    />
  );
}
