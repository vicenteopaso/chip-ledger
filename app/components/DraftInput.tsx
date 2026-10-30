"use client";

import { type InputHTMLAttributes, type Ref, useState } from "react";

export type DraftInputProps<T> = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange"
> & {
  value: T;
  ref?: Ref<HTMLInputElement>;
  format: (value: T) => string;
  parse: (text: string) => T;
  onValueChange: (value: T) => void;
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
  ...props
}: DraftInputProps<T>) {
  const [draft, setDraft] = useState(() => format(value));
  const [seen, setSeen] = useState(value);
  if (!Object.is(seen, value)) {
    setSeen(value);
    if (!Object.is(parse(draft), value)) setDraft(format(value));
  }
  return (
    <input
      {...props}
      value={draft}
      onChange={(event) => {
        const text = event.target.value;
        const next = parse(text);
        setDraft(text);
        setSeen(next);
        onValueChange(next);
      }}
    />
  );
}
