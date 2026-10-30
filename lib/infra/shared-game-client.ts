import { logWarning } from "@/lib/error-logging";
import { type GameSnapshot, GameReplySchema } from "@/lib/shared-game";

/**
 * The browser's calls to `/api/games` (SPEC-0003). The key goes in the Authorization header, never
 * the URL (REQ-0003-04). Every answer is parsed, because the network is external input.
 */

export type FetchOutcome =
  | { kind: "snapshot"; snapshot: GameSnapshot }
  | { kind: "unchanged"; rev: number; archived: boolean; online: number | null }
  /** No such game, or not with this key: one answer for both (REQ-0003-26). */
  | { kind: "unavailable" }
  /** The server asked us to slow down or is out of room; try again later. */
  | { kind: "busy" }
  | { kind: "error" };

export type FetchOptions = {
  id: string;
  key: string;
  /** The revision already held; the server then answers briefly when nothing changed. */
  rev?: number;
  /** Present when this request should also count as a heartbeat. */
  connection?: string;
  signal?: AbortSignal;
};

export async function fetchGame(
  options: FetchOptions,
  send: typeof fetch = fetch,
): Promise<FetchOutcome> {
  const params = new URLSearchParams();
  if (options.rev !== undefined) params.set("rev", String(options.rev));
  if (options.connection) params.set("connection", options.connection);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  let response: Response;
  try {
    response = await send(`/api/games/${options.id}${query}`, {
      headers: { Authorization: `Bearer ${options.key}` },
      cache: "no-store",
      signal: options.signal ?? null,
    });
  } catch {
    // Offline, or the request was cancelled: the caller treats both as a missed check.
    return { kind: "error" };
  }
  if (response.status === 404) return { kind: "unavailable" };
  if (response.status === 429 || response.status === 503) return { kind: "busy" };
  if (!response.ok) return { kind: "error" };
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { kind: "error" };
  }
  const parsed = GameReplySchema.safeParse(body);
  if (!parsed.success) {
    logWarning("Shared game reply failed validation", {
      context: "shared-game-client.fetch",
      issues: parsed.error.issues.length,
    });
    return { kind: "error" };
  }
  if ("unchanged" in parsed.data) {
    const { rev, archived, online } = parsed.data;
    return { kind: "unchanged", rev, archived, online };
  }
  return { kind: "snapshot", snapshot: parsed.data };
}
