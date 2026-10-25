import { afterEach, describe, expect, it, vi } from "vitest";

import { PHOTO_COUNT_ENDPOINT, requestPhotoCount } from "@/lib/infra/photo-count-client";

const colors = [{ color: "red", issued: 40 }] as const;
const file = new Blob(["x"], { type: "image/png" });

function respond(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
}

describe("requestPhotoCount", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("REQ-0001-15: posts the photo and colors and returns a validated result", async () => {
    const fetchImpl = respond({ counts: { red: 3 }, confidence: "high", note: "" });
    const outcome = await requestPhotoCount(file, colors, fetchImpl);
    expect(outcome).toEqual({
      ok: true,
      result: { counts: { red: 3 }, confidence: "high", note: "" },
    });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(PHOTO_COUNT_ENDPOINT);
    const body = init?.body as FormData;
    expect(body.get("colors")).toBe(JSON.stringify(colors));
    expect(body.get("image")).toBeInstanceOf(Blob);
  });

  it("REQ-0001-17: maps problem responses to codes", async () => {
    expect(
      await requestPhotoCount(
        file,
        colors,
        respond({ type: "rate_limited", title: "x", status: 429 }, 429),
      ),
    ).toEqual({ ok: false, code: "rate_limited" });
    expect(await requestPhotoCount(file, colors, respond({ nope: true }, 500))).toEqual({
      ok: false,
      code: "failed",
    });
  });

  it("REQ-0001-17: rejects a success body that fails validation", async () => {
    expect(await requestPhotoCount(file, colors, respond({ counts: { red: -1 } }))).toEqual({
      ok: false,
      code: "invalid_json",
    });
  });

  it("REQ-0001-17: reports network failures generically and logs them", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("offline")));
    expect(await requestPhotoCount(file, colors, fetchImpl)).toEqual({ ok: false, code: "failed" });
    expect(error).toHaveBeenCalledOnce();
  });
});
