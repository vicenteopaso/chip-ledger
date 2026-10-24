import { problemBody } from "@/lib/api-problem";
import { logError } from "@/lib/error-logging";
import {
  ACCEPTED_IMAGE_TYPES,
  buildPhotoPrompt,
  MAX_IMAGE_BYTES,
  parseModelReply,
  PhotoColorsSchema,
} from "@/lib/photo-count";
import { clientKey, isSameOrigin } from "@/lib/request-guards";
import { getPhotoCountConfig } from "@/lib/infra/env";
import { createRateLimiter } from "@/lib/infra/rate-limit";
import { requestVisionCompletion } from "@/lib/infra/vision-client";

/** Five photos per client per minute (REQ-0001-15). */
const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

/** Room for the multipart envelope and the colors field on top of the image itself. */
const MAX_BODY_BYTES = MAX_IMAGE_BYTES + 64 * 1024;

function problem(
  status: number,
  type: string,
  title: string,
  requestId?: string,
  headers?: HeadersInit,
): Response {
  return Response.json(problemBody(status, type, title, requestId), { status, headers });
}

const invalid = (requestId: string) =>
  problem(400, "image_rejected", "The photo could not be read.", requestId);

function isAcceptedImage(value: FormDataEntryValue | null): value is File {
  return (
    value instanceof File &&
    value.size > 0 &&
    value.size <= MAX_IMAGE_BYTES &&
    (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(value.type)
  );
}

function parseColors(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  try {
    const parsed = PhotoColorsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    // Malformed JSON is invalid input, answered with a 400 by the caller.
    return null;
  }
}

/** Counts one player's chips from a photo. Off (404) unless PHOTO_COUNT_ENABLED=true. */
export async function POST(request: Request): Promise<Response> {
  const config = getPhotoCountConfig();
  if (!config.enabled) return problem(404, "not_found", "Not found.");

  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request.headers.get("origin"), request.url)) {
      return problem(403, "forbidden", "This request is not allowed.", requestId);
    }

    const limited = limiter.check(clientKey(request.headers.get("x-forwarded-for")));
    if (!limited.ok) {
      return problem(429, "rate_limited", "Too many requests.", requestId, {
        "Retry-After": String(limited.retryAfterSeconds),
      });
    }

    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_BODY_BYTES) return invalid(requestId);

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      // Not a multipart body we can read: invalid input.
      return invalid(requestId);
    }
    const image = form.get("image");
    const colors = parseColors(form.get("colors"));
    if (!isAcceptedImage(image) || !colors) return invalid(requestId);

    const outcome = await requestVisionCompletion(config, {
      prompt: buildPhotoPrompt(colors),
      mimeType: image.type,
      base64: Buffer.from(await image.arrayBuffer()).toString("base64"),
    });
    if (!outcome.ok) {
      return outcome.code === "refused"
        ? problem(422, "refused", "The photo could not be counted.", requestId)
        : problem(502, "failed", "Photo counting failed.", requestId);
    }

    const result = parseModelReply(outcome.content, colors);
    if (!result) return problem(502, "invalid_json", "The count could not be read.", requestId);
    return Response.json(result);
  } catch (error) {
    logError(error, { context: "POST /api/photo-count", requestId });
    return problem(500, "failed", "Something went wrong. Please try again.", requestId);
  }
}
