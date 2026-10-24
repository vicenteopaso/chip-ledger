import { z } from "zod";

/** The fixed chip palette, in the order "Add a chip color" offers them (REQ-0001-05). */
export const CHIP_COLORS = [
  "white",
  "red",
  "blue",
  "green",
  "black",
  "yellow",
  "purple",
  "pink",
  "orange",
  "gray",
] as const;

export type ChipColor = (typeof CHIP_COLORS)[number];

export const ChipColorSchema = z.enum(CHIP_COLORS);

export const CHIP_LABELS: Record<ChipColor, string> = {
  white: "White",
  red: "Red",
  blue: "Blue",
  green: "Green",
  black: "Black",
  yellow: "Yellow",
  purple: "Purple",
  pink: "Pink",
  orange: "Orange",
  gray: "Gray",
};

/** Colors not yet used by another row, keeping `current` selectable for its own row. */
export function availableColors(used: readonly ChipColor[], current?: ChipColor): ChipColor[] {
  return CHIP_COLORS.filter((color) => color === current || !used.includes(color));
}
