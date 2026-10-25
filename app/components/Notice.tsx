import type { Notice as NoticeData } from "@/lib/summaries";

export type NoticeProps = { notice: NoticeData };

/** A confirmation line (`ok`) or a highlighted note (`warn`). */
export function Notice({ notice }: NoticeProps) {
  return notice.kind === "ok" ? (
    <p className="my-3 text-md text-success">{notice.text}</p>
  ) : (
    <div className="my-3 rounded-md bg-warn-bg px-3.5 py-3 text-md text-warn-ink">
      {notice.text}
    </div>
  );
}
