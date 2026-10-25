import { nextTheme, type Theme, THEME_LABELS } from "@/lib/theme";

export type ThemeToggleProps = { theme: Theme; onChange: (theme: Theme) => void };

/** Icon for the current choice: half-filled circle (System), sun (Light), moon (Dark). */
function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (theme === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" />
    </svg>
  );
}

/**
 * One button that cycles System → Light → Dark. The icon shows the current choice; the
 * accessible name states it in words (REQ-0001-32).
 */
export function ThemeToggle({ theme, onChange }: ThemeToggleProps) {
  const label = `Theme: ${THEME_LABELS[theme]}`;
  return (
    <button
      type="button"
      className="press -mr-2.5 flex size-11 items-center justify-center rounded-md border-0 bg-transparent text-accent"
      aria-label={label}
      title={label}
      onClick={() => {
        onChange(nextTheme(theme));
      }}
    >
      <ThemeIcon theme={theme} />
    </button>
  );
}
