import { describe, expect, it } from "vitest";

import { DEFAULT_PHOTO_COUNT_API_BASE_URL, getPhotoCountConfig, getSiteUrl } from "@/lib/infra/env";

describe("getSiteUrl", () => {
  it("defaults to localhost and strips a trailing slash", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3000");
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://chips.example/" })).toBe(
      "https://chips.example",
    );
  });

  it("names the variable, not the value, when invalid", () => {
    expect(() => getSiteUrl({ NEXT_PUBLIC_SITE_URL: "ftp://x" })).toThrow(
      "NEXT_PUBLIC_SITE_URL must be an http(s) URL.",
    );
  });
});

describe("getPhotoCountConfig", () => {
  it("REQ-0001-13: is off unless PHOTO_COUNT_ENABLED is exactly true", () => {
    expect(getPhotoCountConfig({})).toEqual({ enabled: false });
    expect(getPhotoCountConfig({ PHOTO_COUNT_ENABLED: "1" })).toEqual({ enabled: false });
  });

  it("uses OpenRouter by default when on", () => {
    expect(
      getPhotoCountConfig({
        PHOTO_COUNT_ENABLED: "true",
        PHOTO_COUNT_API_KEY: "k",
        PHOTO_COUNT_MODEL: "m",
      }),
    ).toEqual({
      enabled: true,
      baseUrl: DEFAULT_PHOTO_COUNT_API_BASE_URL,
      apiKey: "k",
      model: "m",
    });
  });

  it("fails fast naming the missing or invalid variable", () => {
    const on = { PHOTO_COUNT_ENABLED: "true" };
    expect(() => getPhotoCountConfig(on)).toThrow("PHOTO_COUNT_API_KEY is required");
    expect(() => getPhotoCountConfig({ ...on, PHOTO_COUNT_API_KEY: "k" })).toThrow(
      "PHOTO_COUNT_MODEL is required",
    );
    expect(() =>
      getPhotoCountConfig({
        ...on,
        PHOTO_COUNT_API_KEY: "k",
        PHOTO_COUNT_MODEL: "m",
        PHOTO_COUNT_API_BASE_URL: "nope",
      }),
    ).toThrow("PHOTO_COUNT_API_BASE_URL must be an http(s) URL.");
  });
});
