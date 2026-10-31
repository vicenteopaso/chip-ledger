import { z } from "zod";

import { logWarning } from "@/lib/error-logging";
import {
  CodeSchema,
  type CreateGameRequest,
  type EditEnvelope,
  type EditFailure,
  GameIdSchema,
  type GameSnapshot,
  GameReplySchema,
  KeySchema,
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

const CreatedSchema = z.object({ id: GameIdSchema, watchKey: KeySchema, editKey: KeySchema });

export type CreateOutcome =
  | { kind: "created"; id: string; watchKey: string; editKey: string }
  /** Sharing is not set up on this server (REQ-0003-27). */
  | { kind: "off" }
  /** Slow down or try later: too many games from this client, or the service is busy (REQ-0003-25). */
  | { kind: "busy" }
  | { kind: "error" };

/** Shares a game: stores it and returns its id with the watch key and the edit key (REQ-0003-01). */
export async function createSharedGame(
  request: CreateGameRequest,
  send: typeof fetch = fetch,
): Promise<CreateOutcome> {
  let response: Response;
  try {
    response = await send("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      cache: "no-store",
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 404) return { kind: "off" };
  if (response.status === 429 || response.status === 503) return { kind: "busy" };
  if (!response.ok) return { kind: "error" };
  const parsed = CreatedSchema.safeParse(await readJsonBody(response));
  if (!parsed.success) {
    logWarning("Created game reply failed validation", { context: "shared-game-client.create" });
    return { kind: "error" };
  }
  return { kind: "created", ...parsed.data };
}

const CodeReplySchema = z.object({ code: CodeSchema, expiresAt: z.number().int() });

export type CodeOutcome =
  | { kind: "issued"; code: string; expiresAt: number }
  | { kind: "unavailable" }
  | { kind: "busy" }
  | { kind: "error" };

/** Asks for a new edit code. It replaces the previous one (REQ-0003-08). */
export async function requestEditCode(
  options: { id: string; key: string },
  send: typeof fetch = fetch,
): Promise<CodeOutcome> {
  let response: Response;
  try {
    response = await send(`/api/games/${options.id}/code`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.key}` },
      cache: "no-store",
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 404) return { kind: "unavailable" };
  if (response.status === 429 || response.status === 503) return { kind: "busy" };
  if (!response.ok) return { kind: "error" };
  const parsed = CodeReplySchema.safeParse(await readJsonBody(response));
  if (!parsed.success) return { kind: "error" };
  return { kind: "issued", ...parsed.data };
}

const UpgradeReplySchema = z.object({ editKey: KeySchema });

export type UpgradeOutcome =
  | { kind: "upgraded"; editKey: string }
  /** Wrong, expired, or replaced: one answer for all three (REQ-0003-09). */
  | { kind: "refused" }
  /** Too many wrong codes: the game refuses every attempt for a minute (REQ-0003-09). */
  | { kind: "locked" }
  | { kind: "error" };

/** Trades the current edit code for this device's own edit key. */
export async function upgradeWithCode(
  options: { id: string; key: string; code: string },
  send: typeof fetch = fetch,
): Promise<UpgradeOutcome> {
  let response: Response;
  try {
    response = await send(`/api/games/${options.id}/upgrade`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code: options.code }),
      cache: "no-store",
    });
  } catch {
    return { kind: "error" };
  }
  if (response.status === 429) return { kind: "locked" };
  if (response.status === 403 || response.status === 400 || response.status === 404) {
    return { kind: "refused" };
  }
  if (!response.ok) return { kind: "error" };
  const parsed = UpgradeReplySchema.safeParse(await readJsonBody(response));
  return parsed.success ? { kind: "upgraded", editKey: parsed.data.editKey } : { kind: "error" };
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
