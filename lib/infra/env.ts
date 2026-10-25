import { z } from "zod";

/**
 * Validated access to environment variables (docs/CONFIGURATION.md). Server-side only: the
 * photo-count key must never reach the browser. Errors name the variable, never its value.
 */

export const DEFAULT_SITE_URL = "http://localhost:3000";
export const DEFAULT_PHOTO_COUNT_API_BASE_URL = "https://openrouter.ai/api/v1";

/** Any environment-like map; `process.env` in production, plain objects in tests. */
type Env = Readonly<Record<string, string | undefined>>;

const SiteUrlSchema = z.url({ protocol: /^https?$/ });

export function getSiteUrl(env: Env = process.env): string {
  const value = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return DEFAULT_SITE_URL;
  const parsed = SiteUrlSchema.safeParse(value);
  if (!parsed.success) throw new Error("NEXT_PUBLIC_SITE_URL must be an http(s) URL.");
  return parsed.data.replace(/\/$/, "");
}

export type PhotoCountConfig =
  { enabled: false } | { enabled: true; baseUrl: string; apiKey: string; model: string };

/** Photo counting is off unless PHOTO_COUNT_ENABLED is exactly "true" (REQ-0001-13). */
export function getPhotoCountConfig(env: Env = process.env): PhotoCountConfig {
  if (env.PHOTO_COUNT_ENABLED !== "true") return { enabled: false };
  const apiKey = env.PHOTO_COUNT_API_KEY?.trim();
  const model = env.PHOTO_COUNT_MODEL?.trim();
  const baseUrl = env.PHOTO_COUNT_API_BASE_URL?.trim() || DEFAULT_PHOTO_COUNT_API_BASE_URL;
  if (!apiKey) throw new Error("PHOTO_COUNT_API_KEY is required when PHOTO_COUNT_ENABLED=true.");
  if (!model) throw new Error("PHOTO_COUNT_MODEL is required when PHOTO_COUNT_ENABLED=true.");
  if (!SiteUrlSchema.safeParse(baseUrl).success) {
    throw new Error("PHOTO_COUNT_API_BASE_URL must be an http(s) URL.");
  }
  return { enabled: true, baseUrl: baseUrl.replace(/\/$/, ""), apiKey, model };
}
