import { expect, type Page, test } from "@playwright/test";

import { openShared, shareGame } from "../e2e/shared-helpers";

/**
 * Full-page snapshots of a shared game as a watcher sees it (SPEC-0003 AC-0003-24), in both
 * themes. The table is shown at phone and desktop widths; the rest at phone width.
 */
const VIEWPORTS = { mobile: { width: 375, height: 812 }, desktop: { width: 1280, height: 900 } };

async function snap(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  // Soft: a stale baseline must not hide the images after it (see screens.spec.ts).
  await expect.soft(page).toHaveScreenshot(`${name}.png`, { fullPage: true });
}

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
