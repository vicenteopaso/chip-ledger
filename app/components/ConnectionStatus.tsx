import {
  type ConnectionStatus as Status,
  NOT_COUNTED_NOTE,
  statusText,
} from "@/lib/shared-game-sync";

const DOT: Record<Status, string> = {
  live: "bg-success",
  reconnecting: "bg-warn-ink",
  offline: "bg-text-muted",
};

export type ConnectionStatusProps = {
  status: Status;
  online: number | null;
  /** Changes made here that the server has not confirmed yet. */
  pending?: number;
};

/**
 * Whether this device is keeping up with the shared game, and how many are here (REQ-0003-13).
 * The words carry the meaning; the dot is only a cue. The page's live region announces changes.
 */
export function ConnectionStatus({ status, online, pending = 0 }: ConnectionStatusProps) {
  return (
    <div className="mt-2 mb-1">
      <p className="flex items-center gap-2 text-md text-text-muted">
        <span className={`size-2.5 flex-none rounded-full ${DOT[status]}`} aria-hidden="true" />
        {statusText(status, online, pending)}
      </p>
      {status === "live" && online !== null && (
        <p className="ml-4.5 text-sm text-text-muted">{NOT_COUNTED_NOTE}</p>
      )}
    </div>
  );
}
