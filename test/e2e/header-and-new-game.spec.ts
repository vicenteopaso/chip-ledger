import { expect, test } from "@playwright/test";

import { openFresh, startGame } from "./helpers";
import { asDevice, openShared, shareGame } from "./shared-helpers";

test.describe("Header and a new game from a shared one", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("the header stays at the top, shrinks and hides Share when scrolled, and the logo stays", async ({
    page,
  }) => {
    await asDevice(page);
    await openFresh(page);
    const banner = page.getByRole("banner");
    await expect(banner.getByRole("button", { name: "Share" })).toBeVisible();
    const tall = (await banner.boundingBox())?.height ?? 0;

    await page.mouse.wheel(0, 600);
    await expect(banner).toHaveAttribute("data-compact", "true");
    // The header shrinks over 150 ms, so wait for its final size.
    await expect.poll(async () => (await banner.boundingBox())?.height ?? tall).toBeLessThan(tall);
    expect((await banner.boundingBox())?.y).toBe(0);
    await expect(banner.getByText("Chip Ledger")).toBeVisible();
    await expect(banner.getByRole("button", { name: "Share" })).toHaveCount(0);
    await expect(banner.getByRole("navigation", { name: "Steps" })).toBeVisible();

    await page.mouse.wheel(0, -1000);
    await expect(banner).toHaveAttribute("data-compact", "false");
    await expect(banner.getByRole("button", { name: "Share" })).toBeVisible();
  });

  test("the bottom bar footer has room: the copyright is not squeezed against the buttons", async ({
    page,
  }) => {
    await openFresh(page);
    await startGame(page);
    const gaps = async () => {
      const button = await page.locator(".action-bar-buttons button").last().boundingBox();
      const footer = await page.locator(".action-bar-footer").boundingBox();
      const bar = await page.locator(".action-bar").boundingBox();
      return {
        above: (footer?.y ?? 0) - ((button?.y ?? 0) + (button?.height ?? 0)),
        below: (bar?.y ?? 0) + (bar?.height ?? 0) - ((footer?.y ?? 0) + (footer?.height ?? 0)),
      };
    };
    // The bar settles over 150 ms, so wait for its final spacing.
    await expect.poll(async () => (await gaps()).above).toBeGreaterThanOrEqual(4);
    await expect.poll(async () => (await gaps()).below).toBeGreaterThanOrEqual(12);
  });

  test("AC-0003-13: New game, same players from a shared game starts a private game here and leaves the shared one alone", async ({
    browser,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    const a = await browser.newPage();
    const b = await browser.newPage();
    await openShared(a, shared.id, shared.editKey);
    await openShared(b, shared.id, shared.editKey);
    await expect(a.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
    await a.getByRole("button", { name: "Add a buy-in for Player 1" }).click();
    await expect(b.getByRole("group", { name: "Buy-ins for Player 1" })).toContainText("2", {
      timeout: 10_000,
    });

    await a.getByRole("button", { name: "Cash out", exact: true }).click();
    await a.getByRole("button", { name: "Settle up" }).click();
    // Settle has a main action, like a solo game, and says what it does to the shared game.
    await expect(a.getByText(/The shared game stays as it is for everyone else/)).toBeVisible();
    await a.getByRole("button", { name: "New game, same players" }).click();

    await expect(a).toHaveURL(/\/$/);
    await expect(a.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
    await expect(a.getByRole("group", { name: "Buy-ins for Player 1" })).toContainText("1");
    // The shared game is unchanged for the other device.
    await expect(b.getByRole("group", { name: "Buy-ins for Player 1" })).toContainText("2");
    await a.close();
    await b.close();
  });

  test("Start over from scratch from a shared game asks first, then opens a blank game here", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.editKey);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await page.getByRole("button", { name: "Settle up" }).click();
    await page.getByRole("button", { name: "Start over from scratch" }).click();
    await expect(page.getByText(/stays as it is for everyone else/).first()).toBeVisible();
    await page.getByRole("button", { name: "Erase everything" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Setup" })).toBeVisible();
  });
});
