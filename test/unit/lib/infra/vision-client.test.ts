import { afterEach, describe, expect, it, vi } from "vitest";

import { requestVisionCompletion } from "@/lib/infra/vision-client";

const config = { baseUrl: "https://llm.example/v1", apiKey: "test-key", model: "vision-model" };
const request = { prompt: "Count", mimeType: "image/png", base64: "AAAA" };

function reply(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status })));
}

describe("requestVisionCompletion", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("REQ-0001-15: posts the prompt and image to the chat-completions endpoint", async () => {
    const fetchImpl = reply({ choices: [{ finish_reason: "stop", message: { content: "{}" } }] });
    expect(await requestVisionCompletion(config, request, fetchImpl)).toEqual({
      ok: true,
      content: "{}",
    });
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://llm.example/v1/chat/completions");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
    const body = JSON.parse(init?.body as string) as {
      model: string;
      messages: { content: unknown[] }[];
    };
    expect(body.model).toBe("vision-model");
    expect(body.messages[0]?.content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,AAAA" },
    });
  });

  it("REQ-0001-17: reports refusals", async () => {
    const refused = reply({ choices: [{ message: { content: null, refusal: "no" } }] });
    expect(await requestVisionCompletion(config, request, refused)).toEqual({
      ok: false,
      code: "refused",
    });
    const filtered = reply({
      choices: [{ finish_reason: "content_filter", message: { content: "" } }],
    });
    expect(await requestVisionCompletion(config, request, filtered)).toEqual({
      ok: false,
      code: "refused",
    });
  });

  it("REQ-0001-17: reports upstream errors and unexpected shapes without detail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(await requestVisionCompletion(config, request, reply({ error: "x" }, 500))).toEqual({
      ok: false,
      code: "upstream_error",
    });
    expect(await requestVisionCompletion(config, request, reply({ choices: [] }))).toEqual({
      ok: false,
      code: "upstream_error",
    });
  });

  it("treats a missing content as an empty reply", async () => {
    const fetchImpl = reply({ choices: [{ message: {} }] });
    expect(await requestVisionCompletion(config, request, fetchImpl)).toEqual({
      ok: true,
      content: "",
    });
  });
});
