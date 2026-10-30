import type { ButtonHTMLAttributes } from "react";

// Transparent borders, not none, so forced-colors mode can paint button edges (REQ-0002-09).
// `aria-disabled` looks like `disabled` but keeps the button focusable (REQ-0002-08).
const VARIANTS = {
  primary:
    "press flex-1 rounded-xl border-control border-transparent bg-accent p-4 text-lg font-extrabold text-accent-ink disabled:opacity-45 aria-disabled:opacity-45",
  secondary:
    "press rounded-xl border-control border-border bg-surface px-4.5 py-4 text-body font-semibold",
  danger:
    "press rounded-xl border-control border-border bg-surface px-4.5 py-4 text-body font-semibold text-danger",
  link: "border-0 bg-transparent py-3 font-semibold text-accent",
} as const;

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className"> & {
  variant: keyof typeof VARIANTS;
};

/** Native button with the app's variants. Always `type="button"`: there are no forms to submit. */
export function Button({ variant, ...props }: ButtonProps) {
  return <button type="button" className={VARIANTS[variant]} {...props} />;
}
