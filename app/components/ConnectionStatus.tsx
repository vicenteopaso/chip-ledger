import { type ConnectionStatus as Status, statusText } from "@/lib/shared-game-sync";

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
    <p className="mt-2 mb-1 flex items-center gap-2 text-md text-text-muted">
      <span className={`size-2.5 flex-none rounded-full ${DOT[status]}`} aria-hidden="true" />
      {statusText(status, online, pending)}
    </p>
  );
}
