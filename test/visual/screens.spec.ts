import { expect, type Page, test } from "@playwright/test";

import { enterCounts, openFresh, SHORT_COUNTS, startGame } from "../e2e/helpers";
import { openShared, shareGame } from "../e2e/shared-helpers";

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

      test("table with a chip sale", async ({ page }) => {
        const tag = `${colorScheme}-${size}`;
        await openFresh(page);
        await startGame(page);
        await page.getByRole("button", { name: "Sell chips" }).click();
        await page.getByRole("combobox", { name: "Buyer" }).selectOption({ label: "Ben" });
        await page.getByRole("textbox", { name: /^Amount in/ }).fill("5");
        await page.getByRole("button", { name: "Record sale" }).click();
        await expect(
          page
            .getByRole("main")
            .getByText(/from chip sales/)
            .first(),
        ).toBeVisible();
        await page.getByRole("heading", { level: 1 }).click();
        await snap(page, `table-sale-${tag}`);
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

/**
 * A shared game as a watcher sees it (SPEC-0003 AC-0003-24), in both themes. The table is shown at
 * phone and desktop widths; the waiting and unavailable pages at phone width. They live in this
 * file so the baseline workflow, which collects this file's snapshots, picks them up.
 */
for (const colorScheme of ["light", "dark"] as const) {
  for (const [size, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(`shared ${colorScheme} ${size}`, () => {
      test.use({ colorScheme, viewport });

      test("watching the table", async ({ page, request, baseURL }) => {
        const shared = await shareGame(request, baseURL ?? "");
        await openShared(page, shared.id, shared.watchKey);
        await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
        await expect(page.getByText("Live · 1 here")).toBeVisible();
        await snap(page, `shared-table-${colorScheme}-${size}`);
      });
    });
  }

  test.describe(`shared ${colorScheme} mobile states`, () => {
    test.use({ colorScheme, viewport: VIEWPORTS.mobile });

    test("waiting for the host, and a game that is not available", async ({
      page,
      request,
      baseURL,
    }) => {
      const shared = await shareGame(request, baseURL ?? "", { started: false });
      await openShared(page, shared.id, shared.watchKey);
      await expect(
        page.getByRole("heading", { level: 1, name: "Waiting for the host" }),
      ).toBeVisible();
      await expect(page.getByText("Live · 1 here")).toBeVisible();
      await snap(page, `shared-waiting-${colorScheme}-mobile`);

      await page.goto("about:blank");
      await page.goto(`/g/${shared.id}#k=${"B".repeat(22)}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "This game isn’t available" }),
      ).toBeVisible();
      await snap(page, `shared-unavailable-${colorScheme}-mobile`);
    });
  });
}
