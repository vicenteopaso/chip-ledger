import { z } from "zod";

import { CHIP_COLORS, type ChipColor, ChipColorSchema } from "@/lib/chips";
import { MAX_COUNT } from "@/lib/money";

/** Image types accepted by the photo-count endpoint and widely supported by vision models. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_ISSUED_PER_COLOR = 10_000;

/** One color in the request: how many of it exist in the whole game (REQ-0001-15). */
export const PhotoColorSchema = z.object({
  color: ChipColorSchema,
  issued: z.number().int().min(0).max(MAX_ISSUED_PER_COLOR),
});

export const PhotoColorsSchema = z
  .array(PhotoColorSchema)
  .min(1)
  .max(CHIP_COLORS.length)
  .refine((colors) => new Set(colors.map((c) => c.color)).size === colors.length, {
    message: "Colors must be unique",
  });

export type PhotoColor = z.infer<typeof PhotoColorSchema>;

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/** What the endpoint returns, and what the client accepts from it. */
export const PhotoCountResultSchema = z.object({
  counts: z.partialRecord(ChipColorSchema, z.number().int().min(0).max(MAX_COUNT)),
  confidence: z.enum(CONFIDENCE_LEVELS),
  note: z.string().max(300),
});

export type PhotoCountResult = z.infer<typeof PhotoCountResultSchema>;

/** The prompt sent with the photo; wording carried over from the prototype. */
export function buildPhotoPrompt(colors: readonly PhotoColor[]): string {
  const list = colors
    .map(
      ({ color, issued }) =>
        `- ${color} (${issued} of these exist in the whole game, so one player cannot have more)`,
    )
    .join("\n");
  const shape = colors.map(({ color }) => `"${color}":0`).join(",");
  return `This photo shows the chips belonging to ONE player at the end of a home Texas Hold'em game. Count how many chips of each color are in the photo.

Chip colors used in this game:
${list}

Chips may be in stacks seen from the side or from above. For stacks, count each individual chip edge carefully rather than estimating from height. Spot colors on chip edges are decoration; classify each chip by its main body color. If a color is not in the photo, use 0.

Reply with only JSON in exactly this shape:
{"counts":{${shape}},"confidence":"high","note":"one short sentence about anything you were unsure of, or empty"}
confidence must be "high", "medium" or "low".`;
}

/** The model's reply is untrusted: accept loosely, then normalize (REQ-0001-15, -16). */
const ModelReplySchema = z.object({
  counts: z.record(z.string(), z.unknown()).optional(),
  confidence: z.unknown().optional(),
  note: z.unknown().optional(),
});

function toCount(value: unknown): number {
  const n = Math.round(Number(value) || 0);
  return Math.min(MAX_COUNT, Math.max(0, n));
}

function stripCodeFence(text: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text.trim());
  return match?.[1] ?? text.trim();
}

/**
 * Parses the model's text reply into a result for the requested colors, or `null` when the
 * reply is not the JSON object we asked for.
 */
export function parseModelReply(
  content: string,
  colors: readonly PhotoColor[],
): PhotoCountResult | null {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(content));
  } catch {
    // Not JSON at all; the caller reports it as an unreadable reply.
    return null;
  }
  const parsed = ModelReplySchema.safeParse(json);
  if (!parsed.success) return null;
  const { counts = {}, confidence, note } = parsed.data;
  const result: Partial<Record<ChipColor, number>> = {};
  for (const { color } of colors) result[color] = toCount(counts[color]);
  return {
    counts: result,
    confidence: CONFIDENCE_LEVELS.find((level) => level === confidence) ?? "medium",
    note: typeof note === "string" ? note.trim().slice(0, 300) : "",
  };
}

/** Error codes the endpoint returns in its problem `type`, and the client understands. */
export const PHOTO_ERROR_CODES = [
  "rate_limited",
  "image_rejected",
  "invalid_json",
  "refused",
  "failed",
] as const;
export type PhotoErrorCode = (typeof PHOTO_ERROR_CODES)[number];

/** Fixed, generic messages per failure (REQ-0001-17). */
export const PHOTO_ERROR_MESSAGES: Record<PhotoErrorCode, string> = {
  rate_limited: "Too many requests right now. Wait a minute and try again, or type the counts.",
  image_rejected: "That photo could not be read. Try another shot.",
  invalid_json: "The count came back garbled. Try the photo again.",
  refused: "This photo could not be counted. Try a clearer shot.",
  failed: "Photo counting failed. Try again or type the counts.",
};

export function photoErrorCode(type: unknown): PhotoErrorCode {
  return PHOTO_ERROR_CODES.find((code) => code === type) ?? "failed";
}

export type PhotoStatus = { kind: "busy" | "info" | "error"; text: string };

export const COUNTING_STATUS: PhotoStatus = {
  kind: "busy",
  text: "Counting chips. This can take up to a minute.",
};

export function photoResultStatus(result: PhotoCountResult): PhotoStatus {
  const note = result.note ? ` ${result.note}` : "";
  return {
    kind: result.confidence === "low" ? "error" : "info",
    text: `Counted from the photo with ${result.confidence} confidence. Check the numbers below.${note}`,
  };
}

export function photoErrorStatus(code: PhotoErrorCode): PhotoStatus {
  return { kind: "error", text: PHOTO_ERROR_MESSAGES[code] };
}
