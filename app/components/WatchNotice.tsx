import { Button } from "@/app/components/Button";
import { Notice } from "@/app/components/Notice";
import type { Role } from "@/lib/shared-game";

export type WatchNoticeProps = {
  access: Role;
  archived: boolean;
  /** Present where an archived game can be copied into a new private game (REQ-0003-20). */
  onDuplicate?: () => void;
};

/** Says in words what this device can do with the game, so it is never only an icon (REQ-0003-29). */
export function WatchNotice({ access, archived, onDuplicate }: WatchNoticeProps) {
  if (archived) {
    return (
      <Notice
        notice={{
          kind: "warn",
          text: "This game is archived. You can read it, but nobody can change it.",
        }}
      >
        {onDuplicate && (
          <Button variant="secondary" onClick={onDuplicate}>
            Duplicate into a new game
          </Button>
        )}
      </Notice>
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
