import { Chip } from "@/app/components/Chip";
import type { ChipColor } from "@/lib/chips";

const STACK: { color: ChipColor; offset: string }[] = [
  { color: "black", offset: "" },
  { color: "red", offset: "-ml-6.5 -translate-y-2.5" },
  { color: "blue", offset: "-ml-6.5 -translate-y-5.5" },
  { color: "green", offset: "-ml-6.5 -translate-y-2" },
  { color: "white", offset: "-ml-6.5 -translate-y-7.5" },
];

/** The scattered chip stack above the Setup heading. Purely decorative. */
export function ChipStackArt() {
  return (
    <div className="mt-1.5 mb-1 flex h-24 items-end" aria-hidden="true">
      {STACK.map(({ color, offset }) => (
        <Chip key={color} color={color} size="xl" className={offset} />
      ))}
    </div>
  );
}
