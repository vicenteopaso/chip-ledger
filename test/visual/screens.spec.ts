import { expect, type Page, test } from "@playwright/test";

import { enterCounts, openFresh, SHORT_COUNTS, startGame } from "../e2e/helpers";
import { asDevice, openAsHost, openShared, shareGame } from "../e2e/shared-helpers";

/** Full-page snapshots of every step (REQ-0001-27), in both themes at phone and desktop widths. */
const VIEWPORTS = { mobile: { width: 375, height: 812 }, desktop: { width: 1280, height: 900 } };

/**
 * Back at the top with the full header, so a picture never depends on how far the page was
 * scrolled before it was taken (the header shrinks once the page is scrolled).
 */
async function atTheTop(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  const header = page.locator(".app-header");
  if ((await header.count()) > 0) await expect(header).toHaveAttribute("data-compact", "false");
}

async function snap(page: Page, name: string) {
  await atTheTop(page);
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

/**
 * The Share sheet (SPEC-0003 AC-0003-24): before sharing and after, in both themes at phone,
 * desktop and 320 px widths, and under forced colors. The code and link are random, so they are
 * masked; their shape is what the picture checks.
 */
const SHEET_VIEWPORTS = { ...VIEWPORTS, narrow: { width: 320, height: 640 } };

async function snapSheet(page: Page, name: string) {
  await atTheTop(page);
  await page.evaluate(() => document.fonts.ready);
  const sheet = page.getByRole("dialog", { name: "Share this game" });
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    mask: [sheet.getByRole("img"), sheet.getByTestId("share-link")],
  });
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const [size, viewport] of Object.entries(SHEET_VIEWPORTS)) {
    test.describe(`share sheet ${colorScheme} ${size}`, () => {
      test.use({ colorScheme, viewport });

      test("before and after sharing", async ({ page, request, baseURL }) => {
        await asDevice(page);
        await openFresh(page);
        await startGame(page);
        await page.getByRole("button", { name: "Share" }).click();
        await expect(page.getByRole("dialog", { name: "Share this game" })).toBeVisible();
        await snapSheet(page, `share-intro-${colorScheme}-${size}`);

        const shared = await shareGame(request, baseURL ?? "");
        const host = await page.context().newPage();
        await host.setViewportSize(viewport);
        await openAsHost(host, shared);
        const sheet = host.getByRole("dialog", { name: "Share this game" });
        await expect(sheet.getByRole("img")).toBeVisible();
        await expect(host.getByText("Live · 1 here")).toBeVisible();
        await snapSheet(host, `share-ready-${colorScheme}-${size}`);
      });
    });
  }
}

test.describe("share sheet forced colors mobile", () => {
  test.use({ forcedColors: "active", viewport: VIEWPORTS.mobile });

  test("after sharing", async ({ page, request, baseURL }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openAsHost(page, shared);
    await expect(
      page.getByRole("dialog", { name: "Share this game" }).getByRole("img"),
    ).toBeVisible();
    await expect(page.getByText("Live · 1 here")).toBeVisible();
    await snapSheet(page, "share-ready-forced-colors-mobile");
  });
});
