import type { ReactNode } from "react";

import type { Notice as NoticeData } from "@/lib/summaries";

export type NoticeProps = {
  notice: Pick<NoticeData, "kind" | "text">;
  /** Extra content under the text, such as Settle's "share the difference" controls. */
  children?: ReactNode;
};

// A tinted panel with a colored rule on the left: unlike a field (bordered box) or a button
// (pill) (REQ-0002-31). The rule and icon are 3:1 against the tint, the text 4.5:1.
const TONE = {
  ok: { box: "border-success bg-success-bg text-text", icon: "text-success" },
  warn: { box: "border-warn-ink bg-warn-bg text-warn-ink", icon: "" },
} as const;

/** A check mark for a confirmation, an exclamation mark for a note. Decorative: the text says it. */
function NoticeIcon({ kind }: { kind: NoticeData["kind"] }) {
  return (
    <svg
      className={`mt-0.5 size-5 flex-none ${TONE[kind].icon}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.5" />
      {kind === "ok" ? <path d="m7.5 12.5 3 3 6-6.5" /> : <path d="M12 7v6.5M12 16.8v.2" />}
    </svg>
  );
}

/**
 * A confirmation (`ok`) or a note (`warn`): the same box for every kind, with an icon, so the
 * kind is never shown by color alone (REQ-0002-23).
 */
export function Notice({ notice, children }: NoticeProps) {
  return (
    <div
      className={`my-3 flex gap-2.5 rounded-r-md border-0 border-l-4 py-3 pr-3.5 pl-3 text-md ${TONE[notice.kind].box}`}
    >
      <NoticeIcon kind={notice.kind} />
      <div className="min-w-0 flex-1">
        {notice.text}
        {children}
      </div>
    </div>
  );
}
