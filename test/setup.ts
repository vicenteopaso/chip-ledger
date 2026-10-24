import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  if (typeof window === "undefined") return;
  // jsdom implements neither scrolling nor object URLs.
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  URL.createObjectURL = vi.fn(() => `blob:test/${String(Math.random())}`);
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  cleanup();
  if (typeof window !== "undefined") window.localStorage.clear();
});
