import { z } from "zod";

import { logWarning } from "@/lib/error-logging";

/** Outbound timeout for the model call (REQ-0001-15). */
export const VISION_TIMEOUT_MS = 60_000;

export type VisionConfig = { baseUrl: string; apiKey: string; model: string };

export type VisionRequest = { prompt: string; mimeType: string; base64: string };

export type VisionOutcome =
  { ok: true; content: string } | { ok: false; code: "refused" | "upstream_error" };

/** The parts of an OpenAI-compatible chat-completions response we read. Upstream is untrusted. */
const ChatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({
          content: z.string().nullish(),
          refusal: z.string().nullish(),
        }),
      }),
    )
    .min(1),
});

/**
 * Sends one image and prompt to an OpenAI-compatible provider (for example OpenRouter) and
 * returns the reply text. Never exposes provider detail to callers beyond a coarse code.
 */
export async function requestVisionCompletion(
  config: VisionConfig,
  request: VisionRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<VisionOutcome> {
  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: request.prompt },
            {
              type: "image_url",
              image_url: { url: `data:${request.mimeType};base64,${request.base64}` },
            },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(VISION_TIMEOUT_MS),
  });

  if (!response.ok) {
    logWarning("Vision provider returned an error status", {
      context: "vision-client",
      status: response.status,
    });
    return { ok: false, code: "upstream_error" };
  }

  const parsed = ChatCompletionSchema.safeParse(await response.json());
  if (!parsed.success) {
    logWarning("Vision provider response did not match the expected shape", {
      context: "vision-client",
    });
    return { ok: false, code: "upstream_error" };
  }

  const [choice] = parsed.data.choices;
  if (!choice || choice.message.refusal || choice.finish_reason === "content_filter") {
    return { ok: false, code: "refused" };
  }
  return { ok: true, content: choice.message.content ?? "" };
}
