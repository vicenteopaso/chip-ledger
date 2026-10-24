import type { ChipColor } from "@/lib/chips";

const SIZES = {
  sm: "size-6.5",
  md: "size-7.5",
  lg: "size-11.5",
  xl: "size-16",
} as const;

export type ChipProps = {
  color: ChipColor;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Decorative chip artwork. Always hidden from assistive technology; pair it with a text label. */
export function Chip({ color, size = "md", className = "" }: ChipProps) {
  return (
    <span className={`chip ${SIZES[size]} ${className}`} data-color={color} aria-hidden="true" />
  );
}
