import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  codeFromBytes,
  codeIsLive,
  CODE_TTL_MS,
  type Role,
  type StoredCode,
  type StoredGame,
} from "@/lib/shared-game";

/**
 * Keys, edit codes, and their hashes (SPEC-0003 REQ-0003-04, -08, -24). Server-only: it uses
 * Node's crypto. Keys carry 128 random bits, so a plain SHA-256 is enough; codes are short, so
 * they are salted and also expire and are rate-limited. Nothing here logs or returns a stored
 * hash's input.
 */

/** A new game id: 12 random bytes, 16 characters. */
export const newGameId = (): string => randomBytes(12).toString("base64url");

/** A new watch or edit key: 16 random bytes, 22 characters. */
export const newKey = (): string => randomBytes(16).toString("base64url");

export const newSalt = (): string => randomBytes(8).toString("hex");

export const newEditCode = (): string => codeFromBytes((length) => randomBytes(length));

export const hashKey = (key: string): string => createHash("sha256").update(key).digest("hex");

export const hashCode = (code: string, salt: string): string =>
  createHash("sha256").update(`${salt}:${code}`).digest("hex");

/** Constant-time comparison of two hex digests. */
export function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

/** The access a presented key grants on a stored game, or `null` for a wrong key. */
export function roleForKey(
  key: string,
  doc: Pick<StoredGame, "watchKeyHash" | "editKeyHashes">,
): Role | null {
  const hash = hashKey(key);
  // Every hash is compared, so the time taken does not reveal which one matched.
  const isEditor = doc.editKeyHashes.map((known) => safeEqualHex(hash, known)).includes(true);
  if (isEditor) return "edit";
  if (safeEqualHex(hash, doc.watchKeyHash)) return "watch";
  return null;
}

/** A fresh code and the record to store; the plain code is shown once and never kept. */
export function issueEditCode(now: number): { code: string; stored: StoredCode } {
  const code = newEditCode();
  const salt = newSalt();
  return { code, stored: { hash: hashCode(code, salt), salt, expiresAt: now + CODE_TTL_MS } };
}

/** True when the entered code (already normalized) matches the live stored code. */
export function codeMatches(code: string, stored: StoredCode | null, now: number): boolean {
  return codeIsLive(stored, now) && safeEqualHex(hashCode(code, stored.salt), stored.hash);
}
