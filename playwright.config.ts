import { defineConfig, devices } from "@playwright/test";

const PORT = 3300;
const baseURL = `http://localhost:${String(PORT)}`;

/** E2E, accessibility and visual projects against a production build (`pnpm build` first). */
export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "UTC",
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" } },
  projects: [
    { name: "e2e", testDir: "test/e2e" },
    { name: "a11y", testDir: "test/a11y" },
    { name: "visual", testDir: "test/visual" },
  ],
  webServer: {
    command: `pnpm start --port ${String(PORT)}`,
    // Shared games (SPEC-0003) keep their data in this server's memory, so tests need no database.
    env: { GAME_STORE_MEMORY: "true" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
