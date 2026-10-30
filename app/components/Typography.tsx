"use client";

import { createContext, type ReactNode, type RefObject, useContext } from "react";

type TextProps = { children: ReactNode };

/**
 * The container provides a ref here so it can move focus to the step title after a step
 * change (REQ-0002-02) without reaching into the DOM.
 */
export const StepTitleContext = createContext<RefObject<HTMLHeadingElement | null> | null>(null);

/** Step title. One per step. Focusable by script only, so focus can land here. */
export function PageTitle({ children }: TextProps) {
  const ref = useContext(StepTitleContext);
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className="mt-7 mb-2 text-5xl leading-display font-extrabold tracking-display"
    >
      {children}
    </h1>
  );
}

export function SectionTitle({ children }: TextProps) {
  return <h2 className="mt-9 mb-3 text-2xl font-semibold">{children}</h2>;
}

export function Lede({ children }: TextProps) {
  return <p className="mb-6 max-w-lede text-text-muted">{children}</p>;
}

export function Hint({ children, className = "" }: TextProps & { className?: string }) {
  return <p className={`mb-2.5 text-md text-text-muted ${className}`}>{children}</p>;
}
