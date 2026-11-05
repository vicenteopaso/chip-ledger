import { initialOf } from "@/lib/game";

export type AvatarProps = {
  name: string;
  /** `brass` marks the player who receives a payment. */
  tone?: "plain" | "brass";
  /** Gives its room back to the name at 320 px (`.avatar-optional` in globals.css). */
  optional?: boolean;
};

const TONE = {
  plain: "bg-avatar text-text",
  brass: "bg-accent-soft text-accent-text",
} as const;

/**
 * A round badge with the first letter of a player's name. Decorative: the name is always
 * written next to it, so it is hidden from assistive technology (REQ-0005-06).
 */
export function Avatar({ name, tone = "plain", optional = false }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-9 flex-none place-items-center rounded-full text-md font-semibold ${TONE[tone]} ${optional ? "avatar-optional" : ""}`}
    >
      {initialOf(name)}
    </span>
  );
}
