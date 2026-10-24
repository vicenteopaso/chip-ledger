import { ProblemSchema } from "@/lib/api-problem";
import { logError } from "@/lib/error-logging";
import {
  type PhotoColor,
  type PhotoCountResult,
  PhotoCountResultSchema,
  type PhotoErrorCode,
  photoErrorCode,
} from "@/lib/photo-count";

export const PHOTO_COUNT_ENDPOINT = "/api/photo-count";

export type PhotoCountOutcome =
  { ok: true; result: PhotoCountResult } | { ok: false; code: PhotoErrorCode };

/** Browser side of photo counting: posts the photo to our own route (REQ-0001-15). */
export async function requestPhotoCount(
  file: Blob,
  colors: readonly PhotoColor[],
  fetchImpl: typeof fetch = fetch,
): Promise<PhotoCountOutcome> {
  const body = new FormData();
  body.set("image", file);
  body.set("colors", JSON.stringify(colors));
  try {
    const response = await fetchImpl(PHOTO_COUNT_ENDPOINT, { method: "POST", body });
    const json: unknown = await response.json();
    if (!response.ok) {
      const problem = ProblemSchema.safeParse(json);
      return { ok: false, code: problem.success ? photoErrorCode(problem.data.type) : "failed" };
    }
    const result = PhotoCountResultSchema.safeParse(json);
    return result.success ? { ok: true, result: result.data } : { ok: false, code: "invalid_json" };
  } catch (error) {
    logError(error, { context: "photo-count-client" });
    return { ok: false, code: "failed" };
  }
}
