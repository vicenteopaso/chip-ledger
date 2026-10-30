import { expect, type Page, test } from "@playwright/test";

import { enterCounts, openFresh, SHORT_COUNTS, startGame } from "../e2e/helpers";

/** Full-page snapshots of every step (REQ-0001-27), in both themes at phone and desktop widths. */
const VIEWPORTS = { mobile: { width: 375, height: 812 }, desktop: { width: 1280, height: 900 } };

async function snap(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  // Soft: a stale baseline must not hide the steps after it, so one CI run lists every image to refresh.
  await expect.soft(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`${colorScheme} ${size}`, () => {
      test.use({ colorScheme, viewport });

      test("every step", async ({ page }) => {
        const tag = `${colorScheme}-${size}`;
        await openFresh(page);
        await snap(page, `setup-${tag}`);
        await startGame(page);
        await page.getByRole("button", { name: "Add a buy-in for Ana" }).click();
        await snap(page, `table-${tag}`);
        await page.getByRole("button", { name: "Cash out", exact: true }).click();
        await enterCounts(page, SHORT_COUNTS);
        await page.getByRole("heading", { level: 1 }).click();
        await snap(page, `cashout-${tag}`);
        await page.getByRole("button", { name: "Settle up" }).click();
        await snap(page, `settle-${tag}`);
      });
    });
  }
}

// AC-0002-09: in forced colors (Windows High Contrast) the current and done steps, button edges,
// and chip colors stay distinguishable.
test.describe("forced colors mobile", () => {
  test.use({ forcedColors: "active", viewport: VIEWPORTS.mobile });

  test("cash out", async ({ page }) => {
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await enterCounts(page, SHORT_COUNTS);
    await page.getByRole("heading", { level: 1 }).click();
    await snap(page, "cashout-forced-colors-mobile");
  });
});
