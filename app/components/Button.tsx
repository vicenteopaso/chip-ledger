import type { ButtonHTMLAttributes, Ref } from "react";

// Transparent borders, not none, so forced-colors mode can paint button edges (REQ-0002-09).
// `aria-disabled` looks like `disabled` but keeps the button focusable (REQ-0002-08).
// Unavailable buttons use the disabled tokens, not opacity (REQ-0002-18); hover applies only
// to available ones, and Tailwind's `hover:` already requires a device that can hover (REQ-0002-17).
const UNAVAILABLE =
  "disabled:bg-disabled-bg disabled:text-disabled-ink aria-disabled:bg-disabled-bg aria-disabled:text-disabled-ink";
const SURFACE_HOVER = "hover:not-disabled:not-aria-disabled:bg-surface-hover";

const VARIANTS = {
  primary: `press flex-1 rounded-xl border-control border-transparent bg-accent p-4 text-lg font-extrabold text-accent-ink hover:not-disabled:not-aria-disabled:bg-accent-hover ${UNAVAILABLE}`,
  secondary: `press rounded-xl border-control border-border bg-surface px-4.5 py-4 text-body font-semibold ${SURFACE_HOVER} ${UNAVAILABLE}`,
  danger: `press rounded-xl border-control border-border bg-surface px-4.5 py-4 text-body font-semibold text-danger ${SURFACE_HOVER} ${UNAVAILABLE}`,
  link: "border-0 bg-transparent py-3 font-semibold text-accent hover:underline",
  outline: `press inline-flex items-center justify-center gap-2 rounded-xl border-control border-accent bg-surface px-4.5 py-3 text-body font-semibold text-accent ${SURFACE_HOVER} ${UNAVAILABLE}`,
} as const;

/**
 * The classes of a variant, for an element that must look like a button but can't be one: the
 * photo control is a `<label>` around a native file input (REQ-0002-21).
 */
export function buttonClasses(variant: keyof typeof VARIANTS): string {
  return VARIANTS[variant];
}

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className"> & {
  variant: keyof typeof VARIANTS;
  ref?: Ref<HTMLButtonElement>;
};

/** Native button with the app's variants. Always `type="button"`: there are no forms to submit. */
export function Button({ variant, ...props }: ButtonProps) {
  return <button type="button" className={VARIANTS[variant]} {...props} />;
}
