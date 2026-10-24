import { describe, expect, it } from "vitest";

import {
  buildPhotoPrompt,
  COUNTING_STATUS,
  parseModelReply,
  PHOTO_ERROR_MESSAGES,
  PhotoColorsSchema,
  photoErrorCode,
  photoErrorStatus,
  photoResultStatus,
} from "@/lib/photo-count";

const colors = [
  { color: "white", issued: 80 },
  { color: "red", issued: 40 },
  { color: "blue", issued: 40 },
] as const;

describe("PhotoColorsSchema", () => {
  it("REQ-0001-15: accepts 1–10 unique palette colors with issued totals in range", () => {
    expect(PhotoColorsSchema.safeParse(colors).success).toBe(true);
    expect(PhotoColorsSchema.safeParse([]).success).toBe(false);
    expect(PhotoColorsSchema.safeParse([colors[0], colors[0]]).success).toBe(false);
    expect(PhotoColorsSchema.safeParse([{ color: "teal", issued: 1 }]).success).toBe(false);
    expect(PhotoColorsSchema.safeParse([{ color: "red", issued: 10_001 }]).success).toBe(false);
  });
});

describe("buildPhotoPrompt", () => {
  it("REQ-0001-15: names each color with its issued total and the reply shape", () => {
    const prompt = buildPhotoPrompt(colors);
    expect(prompt).toContain(
      "- white (80 of these exist in the whole game, so one player cannot have more)",
    );
    expect(prompt).toContain('{"counts":{"white":0,"red":0,"blue":0},"confidence":"high"');
  });
});

describe("parseModelReply", () => {
  it("AC-0001-09: rounds, clamps, defaults missing colors and unknown confidence", () => {
    const reply = '{"counts":{"white":3.6,"red":-2},"confidence":"weird","note":"Blurry"}';
    expect(parseModelReply(reply, colors)).toEqual({
      counts: { white: 4, red: 0, blue: 0 },
      confidence: "medium",
      note: "Blurry",
    });
  });

  it("REQ-0001-16: accepts a fenced reply and keeps a known confidence", () => {
    const reply = '```json\n{"counts":{"blue":"7"},"confidence":"low","note":42}\n```';
    expect(parseModelReply(reply, colors)).toEqual({
      counts: { white: 0, red: 0, blue: 7 },
      confidence: "low",
      note: "",
    });
  });

  it("REQ-0001-17: returns null for a reply that is not the requested JSON object", () => {
    expect(parseModelReply("I count four chips.", colors)).toBeNull();
    expect(parseModelReply('{"counts":"many"}', colors)).toBeNull();
  });
});

describe("statuses", () => {
  it("AC-0001-09: describes the result, flagging low confidence as an error", () => {
    expect(photoResultStatus({ counts: {}, confidence: "medium", note: "Blurry" })).toEqual({
      kind: "info",
      text: "Counted from the photo with medium confidence. Check the numbers below. Blurry",
    });
    expect(photoResultStatus({ counts: {}, confidence: "low", note: "" }).kind).toBe("error");
    expect(COUNTING_STATUS.text).toBe("Counting chips. This can take up to a minute.");
  });

  it("REQ-0001-17: maps known codes to fixed messages and anything else to a generic one", () => {
    expect(photoErrorCode("rate_limited")).toBe("rate_limited");
    expect(photoErrorCode("internal_error")).toBe("failed");
    expect(photoErrorStatus("rate_limited")).toEqual({
      kind: "error",
      text: PHOTO_ERROR_MESSAGES.rate_limited,
    });
    expect(PHOTO_ERROR_MESSAGES.failed).toBe(
      "Photo counting failed. Try again or type the counts.",
    );
  });
});
