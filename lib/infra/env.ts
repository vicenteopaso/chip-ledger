import { z } from "zod";

import { logError } from "@/lib/error-logging";

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

export type GameStoreConfig =
  | { enabled: false }
  | { enabled: true; kind: "memory"; namespace: string }
  | { enabled: true; kind: "upstash"; url: string; token: string; namespace: string };

/** Vercel's environment slug (`production`, `preview`, or a custom one); `local` elsewhere. */
const NamespaceSchema = z.string().regex(/^[a-z0-9-]{1,32}$/);

/**
 * Where shared games are kept (SPEC-0003). Off unless the Upstash REST variables are both set, or
 * `GAME_STORE_MEMORY=true` asks for the in-memory store for local development and end-to-end
 * tests. The in-memory store is refused on Vercel, where each request may reach a different
 * instance. Every key is prefixed with the environment so Preview and Production can share one
 * database without sharing data (ADR-0005).
 */
export function getGameStoreConfig(env: Env = process.env): GameStoreConfig {
  const rawNamespace = env.VERCEL_ENV?.trim() || "local";
  const namespace = NamespaceSchema.safeParse(rawNamespace);
  if (!namespace.success) throw new Error("VERCEL_ENV must be a lowercase slug.");

  const url = env.KV_REST_API_URL?.trim();
  const token = env.KV_REST_API_TOKEN?.trim();
  if (url || token) {
    if (!url) throw new Error("KV_REST_API_URL is required when KV_REST_API_TOKEN is set.");
    if (!token) throw new Error("KV_REST_API_TOKEN is required when KV_REST_API_URL is set.");
    if (!SiteUrlSchema.safeParse(url).success) {
      throw new Error("KV_REST_API_URL must be an http(s) URL.");
    }
    return {
      enabled: true,
      kind: "upstash",
      url: url.replace(/\/$/, ""),
      token,
      namespace: namespace.data,
    };
  }

  if (env.GAME_STORE_MEMORY === "true") {
    if (env.VERCEL_ENV) throw new Error("GAME_STORE_MEMORY is not allowed on Vercel.");
    return { enabled: true, kind: "memory", namespace: namespace.data };
  }
  return { enabled: false };
}

/**
 * Whether the Share button is offered: the store is configured. A half-set configuration is
 * logged and counts as off, so a mistake in the settings hides sharing instead of breaking the
 * page (SPEC-0003 REQ-0003-27).
 */
export function isSharingEnabled(env: Env = process.env): boolean {
  try {
    return getGameStoreConfig(env).enabled;
  } catch (error) {
    logError(error, { context: "env.isSharingEnabled" });
    return false;
  }
}
