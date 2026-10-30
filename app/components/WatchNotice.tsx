import { Notice } from "@/app/components/Notice";
import type { Role } from "@/lib/shared-game";

export type WatchNoticeProps = { access: Role; archived: boolean };

/** Says in words what this device can do with the game, so it is never only an icon (REQ-0003-29). */
export function WatchNotice({ access, archived }: WatchNoticeProps) {
  if (archived) {
    return (
      <Notice
        notice={{
          kind: "warn",
          text: "This game is archived. You can read it, but nobody can change it.",
        }}
      />
    );
  }
  // Someone who can edit is not told they are watching.
  if (access === "edit") return null;
  return (
    <Notice
      notice={{
        kind: "warn",
        text: "Watch only. You can follow this game, but only people with edit access can change it.",
      }}
    />
  );
}
