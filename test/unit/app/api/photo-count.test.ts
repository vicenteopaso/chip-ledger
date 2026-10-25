// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/photo-count/route";
import { requestVisionCompletion } from "@/lib/infra/vision-client";

vi.mock("@/lib/infra/vision-client", () => ({ requestVisionCompletion: vi.fn() }));

const vision = vi.mocked(requestVisionCompletion);
const URL_ = "https://chips.example/api/photo-count";
const COLORS = JSON.stringify([
  { color: "white", issued: 80 },
  { color: "red", issued: 40 },
]);
let client = 0;

type PhotoRequestOptions = {
  origin?: string;
  image?: File | string;
  colors?: string;
  ip?: string;
  headers?: Record<string, string>;
};

function photoRequest({
  origin = "https://chips.example",
  image = new File([new Uint8Array([1, 2, 3])], "chips.png", { type: "image/png" }),
  colors = COLORS,
  ip = `198.51.100.${String((client += 1))}`,
  headers = {},
}: PhotoRequestOptions = {}) {
  const body = new FormData();
  body.set("image", image);
  body.set("colors", colors);
  return new Request(URL_, {
    method: "POST",
    body,
    headers: { origin, "x-forwarded-for": ip, ...headers },
  });
}

async function problemType(response: Response) {
  return ((await response.json()) as { type: string }).type;
}

describe("POST /api/photo-count", () => {
  beforeEach(() => {
    vi.stubEnv("PHOTO_COUNT_ENABLED", "true");
    vi.stubEnv("PHOTO_COUNT_API_KEY", "test-key");
    vi.stubEnv("PHOTO_COUNT_MODEL", "vision-model");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vision.mockReset();
  });

  it("AC-0001-08: responds 404 when photo counting is off, without reading the request", async () => {
    vi.stubEnv("PHOTO_COUNT_ENABLED", "");
    const response = await POST(photoRequest());
    expect(response.status).toBe(404);
    expect(vision).not.toHaveBeenCalled();
  });

  it("AC-0001-09: returns the normalized counts from the model reply", async () => {
    vision.mockResolvedValue({
      ok: true,
      content: '{"counts":{"white":3.6,"red":-2},"confidence":"weird","note":"Blurry"}',
    });
    const response = await POST(photoRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      counts: { white: 4, red: 0 },
      confidence: "medium",
      note: "Blurry",
    });
    expect(vision).toHaveBeenCalledWith(
      {
        enabled: true,
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "test-key",
        model: "vision-model",
      },
      expect.objectContaining({ mimeType: "image/png", base64: "AQID" }),
    );
  });

  it("AC-0001-09: rejects cross-origin requests with 403", async () => {
    const response = await POST(photoRequest({ origin: "https://evil.example" }));
    expect(response.status).toBe(403);
  });

  it("AC-0001-09: rate-limits the sixth request in a minute from one client", async () => {
    vision.mockResolvedValue({ ok: true, content: "{}" });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1)
      statuses.push((await POST(photoRequest({ ip: "192.0.2.50" }))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    const limited = await POST(photoRequest({ ip: "192.0.2.50" }));
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
    expect(await problemType(limited)).toBe("rate_limited");
  });

  it("AC-0001-09: rejects an oversized body, a non-image, and bad colors with 400", async () => {
    const big = await POST(
      photoRequest({ headers: { "content-length": String(9 * 1024 * 1024) } }),
    );
    expect(big.status).toBe(400);
    const text = await POST(
      photoRequest({ image: new File(["x"], "a.txt", { type: "text/plain" }) }),
    );
    expect(await problemType(text)).toBe("image_rejected");
    expect((await POST(photoRequest({ image: "not a file" }))).status).toBe(400);
    expect((await POST(photoRequest({ colors: "{oops" }))).status).toBe(400);
    expect((await POST(photoRequest({ colors: "[]" }))).status).toBe(400);
  });

  it("rejects a body that is not multipart with 400", async () => {
    const request = new Request(URL_, {
      method: "POST",
      body: "plain",
      headers: { origin: "https://chips.example", "content-type": "text/plain" },
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("REQ-0001-17: maps refusals, upstream errors and unreadable replies", async () => {
    vision.mockResolvedValueOnce({ ok: false, code: "refused" });
    expect(await problemType(await POST(photoRequest()))).toBe("refused");
    vision.mockResolvedValueOnce({ ok: false, code: "upstream_error" });
    const upstream = await POST(photoRequest());
    expect(upstream.status).toBe(502);
    expect(await problemType(upstream)).toBe("failed");
    vision.mockResolvedValueOnce({ ok: true, content: "four chips" });
    expect(await problemType(await POST(photoRequest()))).toBe("invalid_json");
  });

  it("AC-0001-09: an upstream timeout returns a generic 500 and logs one error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vision.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));
    const response = await POST(photoRequest());
    expect(response.status).toBe(500);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      type: "failed",
      title: "Something went wrong. Please try again.",
    });
    expect(JSON.stringify(body)).not.toContain("timed out");
    expect(log).toHaveBeenCalledOnce();
  });
});
