import type { Ref, SelectHTMLAttributes } from "react";

import { FIELD } from "@/app/components/Field";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
  /** Extra classes for the select: its left padding and text size. */
  className?: string;
  ref?: Ref<HTMLSelectElement>;
};

/**
 * A native select in the field style, with its own chevron inside the box. The browser's arrow
 * is removed because each engine places it differently, some almost outside the control
 * (REQ-0002-32). The chevron is decorative: the select is still announced as a list box.
 */
export function Select({ className = "", ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={`${FIELD} w-full appearance-none pr-8 ${className}`} {...props} />
      <svg
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-text-muted"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m4 6 4 4 4-4" />
      </svg>
    </div>
  );
}
