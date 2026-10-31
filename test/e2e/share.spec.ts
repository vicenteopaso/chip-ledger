import { expect, type Page, test } from "@playwright/test";

import { openFresh, startGame } from "./helpers";
import { asDevice, openAsHost, shareGame } from "./shared-helpers";

const sheet = (page: Page) => page.getByRole("dialog", { name: "Share this game" });
const title = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

test.describe("SPEC-0003 Share sheet, QR code and edit codes", () => {
  test("AC-0003-01, -17: sharing sends nothing until the host presses Create the link", async ({
    page,
  }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/games")) calls.push(request.url());
    });
    await asDevice(page);
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Share" }).click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByText(/24 hours/)).toBeVisible();
    await expect(sheet(page).getByText(/30 days/)).toBeVisible();
    expect(calls).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toBeHidden();
    await expect(page.getByRole("button", { name: "Share" })).toBeFocused();
    expect(calls).toEqual([]);
  });

  test("AC-0003-02: Create the link opens the shared game with the sheet: QR, link, Copy link, Watch only first", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await asDevice(page);
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Share" }).click();
    await sheet(page).getByRole("button", { name: "Create the link" }).click();

    await expect(sheet(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/g\/[\w-]+$/);
    await expect(sheet(page).getByRole("img")).toHaveAccessibleName(/watch only link/i);
    await expect(sheet(page).getByRole("radio", { name: /Watch only/ })).toBeChecked();
    const link = sheet(page).getByTestId("share-link");
    const watchLink = (await link.textContent()) ?? "";
    expect(watchLink).toMatch(/\/g\/[\w-]+#k=/);
    const watchQr = await sheet(page).getByRole("img").innerHTML();

    await sheet(page)
      .getByRole("radio", { name: /Can edit/ })
      .check();
    const editLink = (await link.textContent()) ?? "";
    expect(editLink).not.toBe(watchLink);
    expect(await sheet(page).getByRole("img").innerHTML()).not.toBe(watchQr);
    await expect(sheet(page).getByRole("img")).toHaveAccessibleName(/can edit link/i);

    await sheet(page)
      .getByRole("radio", { name: /Watch only/ })
      .check();
    await sheet(page).getByRole("button", { name: "Copy link" }).click();
    await expect(sheet(page).getByText("Link copied.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(watchLink);

    // The key is gone from the address bar, and the sheet starts at Watch only on the next open.
    expect(page.url()).not.toContain("#k=");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Share" }).click();
    await expect(sheet(page).getByRole("radio", { name: /Watch only/ })).toBeChecked();
  });

  test("AC-0003-04, -22: a watch link opens the game read-only; the sheet keeps focus and Tab inside", async ({
    browser,
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openAsHost(page, shared);
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByRole("heading", { name: "Share this game" })).toBeFocused();
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() => document.activeElement?.closest("[role=dialog]") !== null),
      ).toBe(true);
    }

    const link = (await sheet(page).getByTestId("share-link").textContent()) ?? "";
    const guest = await browser.newPage();
    await asDevice(guest);
    await guest.goto(link);
    await expect(title(guest, "At the table")).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText(/^Watch only/)).toBeVisible();
    await expect(guest.getByRole("button", { name: "Add a buy-in for Player 1" })).toHaveCount(0);
    await guest.close();
  });

  test("AC-0003-07, -08: a watcher becomes an editor with the current code; an old or wrong code fails the same way", async ({
    browser,
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openAsHost(page, shared);
    await sheet(page).getByRole("button", { name: "Show edit code" }).click();
    const first = await sheet(page).locator("[aria-label^='Edit code:']").textContent();
    expect(first).toMatch(/^[A-Z2-9]{6}$/);
    await sheet(page).getByRole("button", { name: "New code" }).click();
    await expect(sheet(page).locator("[aria-label^='Edit code:']")).not.toHaveText(first ?? "");
    const second = (await sheet(page).locator("[aria-label^='Edit code:']").textContent()) ?? "";

    const guest = await browser.newPage();
    await asDevice(guest);
    await guest.goto(`/g/${shared.id}#k=${shared.watchKey}`);
    await expect(title(guest, "At the table")).toBeVisible({ timeout: 10_000 });
    await guest.getByRole("button", { name: "I have an edit code" }).click();

    // The replaced code and a made-up one get the same message.
    for (const wrong of [first ?? "", second === "ABCDEF" ? "BCDEFG" : "ABCDEF"]) {
      await guest.getByRole("textbox", { name: "Edit code" }).fill(wrong);
      await guest.getByRole("button", { name: "Join as editor" }).click();
      await expect(guest.getByText("That code didn't work.")).toBeVisible();
    }
    await expect(guest.getByRole("button", { name: "Add a buy-in for Player 1" })).toHaveCount(0);

    await guest.getByRole("textbox", { name: "Edit code" }).fill(second);
    await guest.getByRole("button", { name: "Join as editor" }).click();
    await expect(guest.getByRole("button", { name: "Add a buy-in for Player 1" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(guest.getByRole("button", { name: "I have an edit code" })).toHaveCount(0);
    await guest.close();
  });
});
