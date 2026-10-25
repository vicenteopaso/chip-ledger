import type { ReactNode } from "react";

type TextProps = { children: ReactNode };

/** Step title. One per step. */
export function PageTitle({ children }: TextProps) {
  return (
    <h1 className="mt-2.5 mb-1.5 text-5xl leading-display font-extrabold tracking-display">
      {children}
    </h1>
  );
}

export function SectionTitle({ children }: TextProps) {
  return <h2 className="mt-7 mb-2.5 text-2xl font-semibold">{children}</h2>;
}

export function Lede({ children }: TextProps) {
  return <p className="mb-2.5 max-w-[40ch] text-text-muted">{children}</p>;
}

export function Hint({ children, className = "" }: TextProps & { className?: string }) {
  return <p className={`mb-2.5 text-md text-text-muted ${className}`}>{children}</p>;
}
