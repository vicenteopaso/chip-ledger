import { logWarning } from "@/lib/error-logging";
import {
  type EditEnvelope,
  type EditFailure,
  type GameSnapshot,
  GameReplySchema,
  SnapshotSchema,
} from "@/lib/shared-game";

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

export type SendOutcome =
  | { kind: "saved"; snapshot: GameSnapshot }
  /** The server will never accept this edit: drop it and tell the person (REQ-0003-06, -23). */
  | { kind: "rejected"; reason: EditFailure }
  | { kind: "unavailable" }
  /** Offline, busy, or out of room: keep the edit and try again later (REQ-0003-14). */
  | { kind: "retry" };

const REJECTIONS: Record<string, EditFailure> = {
  forbidden: "forbidden",
  game_archived: "archived",
  stale: "stale",
  invalid_request: "invalid",
  too_large: "too_large",
};

/** Sends one edit. The same action id may be sent again after an unclear failure (REQ-0003-11). */
export async function sendEdit(
  options: { id: string; key: string; envelope: EditEnvelope; signal?: AbortSignal },
  send: typeof fetch = fetch,
): Promise<SendOutcome> {
  let response: Response;
  try {
    response = await send(`/api/games/${options.id}/actions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(options.envelope),
      cache: "no-store",
      signal: options.signal ?? null,
    });
  } catch {
    // Offline, or the request was cancelled: the caller keeps the edit and tries again.
    return { kind: "retry" };
  }
  if (response.status === 404) return { kind: "unavailable" };
  if (response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { kind: "retry" };
    }
    const parsed = SnapshotSchema.safeParse(body);
    if (parsed.success) return { kind: "saved", snapshot: parsed.data };
    logWarning("Saved edit reply failed validation", { context: "shared-game-client.send" });
    return { kind: "retry" };
  }
  if (
    response.status === 403 ||
    (response.status >= 400 && response.status < 500 && response.status !== 429)
  ) {
    let type = "";
    try {
      type = ((await response.json()) as { type?: string }).type ?? "";
    } catch {
      // No readable reason: treat the edit as invalid below.
    }
    // A lost race between two editors is worth another try; every other 4xx will not change.
    if (type === "conflict") return { kind: "retry" };
    return { kind: "rejected", reason: REJECTIONS[type] ?? "invalid" };
  }
  return { kind: "retry" };
}
