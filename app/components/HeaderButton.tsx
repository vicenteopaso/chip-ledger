import type { ReactNode } from "react";

import { buttonClasses } from "@/app/components/Button";

const ICONS: Record<"share" | "games", ReactNode> = {
  share: (
    <>
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </>
  ),
  games: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </>
  ),
};

export type HeaderButtonProps = {
  label: string;
  icon: keyof typeof ICONS;
  onClick: () => void;
};

/**
 * A control at the end of the header's brand row (Share, Games). On a phone it is just the icon,
 * so the brand and two controls fit in 320 px; from a wider screen the name shows too. The name is
 * always there for screen readers.
 */
export function HeaderButton({ label, icon, onClick }: HeaderButtonProps) {
  return (
    <button
      type="button"
      className={`${buttonClasses("secondary")} inline-flex items-center justify-center gap-2 max-sm:px-3`}
      onClick={onClick}
    >
      <svg
        className="size-5 flex-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {ICONS[icon]}
      </svg>
      <span className="max-sm:sr-only">{label}</span>
    </button>
  );
}
