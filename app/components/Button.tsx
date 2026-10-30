import type { ButtonHTMLAttributes, Ref } from "react";

// Transparent borders, not none, so forced-colors mode can paint button edges (REQ-0002-09).
// `aria-disabled` looks like `disabled` but keeps the button focusable (REQ-0002-08).
// Unavailable buttons use the disabled tokens, not opacity (REQ-0002-18); hover applies only
// to available ones, and Tailwind's `hover:` already requires a device that can hover (REQ-0002-17).
const UNAVAILABLE =
  "disabled:bg-disabled-bg disabled:text-disabled-ink aria-disabled:bg-disabled-bg aria-disabled:text-disabled-ink";
// Every button is a pill, so a button never looks like a field (squared box) or a notice
// (tinted panel with a left rule) (REQ-0002-31).
const PILL = "press min-h-12 rounded-full border-control px-5 text-body font-semibold";

const VARIANTS = {
  primary: `press min-h-14 flex-1 rounded-full border-control border-transparent bg-accent px-5 text-lg font-extrabold text-accent-ink hover:not-disabled:not-aria-disabled:bg-accent-hover ${UNAVAILABLE}`,
  secondary: `${PILL} border-transparent bg-accent-soft text-text hover:not-disabled:not-aria-disabled:bg-accent-soft-hover ${UNAVAILABLE}`,
  danger: `${PILL} border-transparent bg-danger-soft text-danger hover:not-disabled:not-aria-disabled:bg-danger-soft-hover ${UNAVAILABLE}`,
  link: "border-0 bg-transparent py-3 font-semibold text-accent hover:underline",
  outline: `${PILL} inline-flex items-center justify-center gap-2 border-accent bg-surface text-accent hover:not-disabled:not-aria-disabled:bg-surface-hover ${UNAVAILABLE}`,
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
