// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  codeMatches,
  hashCode,
  hashKey,
  issueEditCode,
  newEditCode,
  newGameId,
  newKey,
  roleForKey,
  safeEqualHex,
} from "@/lib/infra/secrets";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  CODE_TTL_MS,
  GameIdSchema,
  KeySchema,
} from "@/lib/shared-game";

describe("keys and ids (REQ-0003-04)", () => {
  it("makes well-formed, distinct ids and 128-bit keys", () => {
    const keys = new Set(Array.from({ length: 50 }, newKey));
    expect(keys.size).toBe(50);
    for (const key of keys) expect(KeySchema.safeParse(key).success).toBe(true);
    expect(GameIdSchema.safeParse(newGameId()).success).toBe(true);
    // 22 base64url characters carry 132 bits; 16 bytes are 128 of them.
    expect(Buffer.from(newKey(), "base64url")).toHaveLength(16);
  });
});

describe("hashing (REQ-0003-24)", () => {
  it("hashes a key to 64 hex characters that do not contain the key", () => {
    const key = newKey();
    const hash = hashKey(key);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(key);
    expect(hashKey(key)).toBe(hash);
  });

  it("compares in constant time and rejects malformed input", () => {
    const hash = hashKey("k");
    expect(safeEqualHex(hash, hash)).toBe(true);
    expect(safeEqualHex(hash, hashKey("other"))).toBe(false);
    expect(safeEqualHex(hash, "abcd")).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
  });

  it("REQ-0003-05, -06: the key decides the role", () => {
    const edit = newKey();
    const watch = newKey();
    const second = newKey();
    const doc = { editKeyHashes: [hashKey(edit), hashKey(second)], watchKeyHash: hashKey(watch) };
    expect(roleForKey(edit, doc)).toBe("edit");
    expect(roleForKey(second, doc)).toBe("edit");
    expect(roleForKey(watch, doc)).toBe("watch");
    expect(roleForKey(newKey(), doc)).toBeNull();
  });
});

describe("edit codes (REQ-0003-08)", () => {
  it("makes a 6-character code from the alphabet", () => {
    for (let i = 0; i < 100; i += 1) {
      const code = newEditCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(Array.from(code).every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    }
  });

  it("stores a salted hash that expires in 10 minutes and matches the plain code", () => {
    const { code, stored } = issueEditCode(1000);
    expect(stored.expiresAt).toBe(1000 + CODE_TTL_MS);
    expect(JSON.stringify(stored)).not.toContain(code);
    expect(stored.hash).toBe(hashCode(code, stored.salt));
    expect(codeMatches(code, stored, 2000)).toBe(true);
  });

  it("rejects a wrong code, an expired code, and a replaced code", () => {
    const first = issueEditCode(0);
    const wrong = first.code === "AAAAAA" ? "BBBBBB" : "AAAAAA";
    expect(codeMatches(wrong, first.stored, 1)).toBe(false);
    expect(codeMatches(first.code, first.stored, CODE_TTL_MS)).toBe(false);
    const second = issueEditCode(0);
    expect(codeMatches(first.code, second.stored, 1)).toBe(first.code === second.code);
    expect(codeMatches(first.code, null, 1)).toBe(false);
  });
});
