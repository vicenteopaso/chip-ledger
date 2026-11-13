import { expect, type Page, test } from "@playwright/test";

import { openFresh, startGame } from "./helpers";
import {
  asDevice,
  editGame,
  openAsHost,
  openShared,
  shareGame,
  uniqueClient,
} from "./shared-helpers";

const sheet = (page: Page) => page.getByRole("dialog", { name: "Share this game" });
const title = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });
const linkText = async (page: Page) =>
  (await sheet(page).getByTestId("share-link").textContent()) ?? "";

test.describe("SPEC-0007 watch link from any device in the game", () => {
  test("AC-0007-01, -04, -07: a guest who joined with the edit link shows a watch link that only watches", async ({
    browser,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    const revOf = async () =>
      (
        (await (
          await request.get(`/api/games/${shared.id}`, {
            headers: {
              authorization: `Bearer ${shared.watchKey}`,
              "x-forwarded-for": uniqueClient(),
            },
          })
        ).json()) as { rev: number }
      ).rev;
    const before = await revOf();

    // The host shows the Can edit link.
    const host = await (await browser.newContext()).newPage();
    await openAsHost(host, shared);
    await sheet(host)
      .getByRole("radio", { name: /Can edit/ })
      .check();
    const editLink = await linkText(host);
    expect(editLink).toContain(`#k=${shared.editKey}&w=${shared.watchKey}`);

    // A guest opens it, can edit, and can show the Watch only link.
    const guest = await (await browser.newContext()).newPage();
    await asDevice(guest);
    await guest.goto(editLink);
    await expect(guest.getByRole("button", { name: "Add a buy-in for Player 1" })).toBeVisible();
    expect(new URL(guest.url()).hash).toBe("");
    await guest.getByRole("button", { name: "Share" }).click();
    await expect(sheet(guest).getByRole("radio", { name: /Watch only/ })).toBeChecked();
    await expect(sheet(guest).getByRole("img")).toHaveAccessibleName(/watch only link/i);
    const watchLink = await linkText(guest);
    expect(watchLink).toContain(`/g/${shared.id}#k=${shared.watchKey}`);
    expect(watchLink).not.toContain(shared.editKey);
    expect(watchLink).not.toContain("&w=");
    await expect(sheet(guest).getByText(/older edit link|started sharing/)).toHaveCount(0);

    // A third phone opens the guest's watch link: it watches, and nothing more.
    const third = await (await browser.newContext()).newPage();
    await asDevice(third);
    await third.goto(watchLink);
    await expect(title(third, "At the table")).toBeVisible();
    await expect(third.getByText(/^Watch only/)).toBeVisible();
    await expect(third.getByRole("button", { name: /buy-in for/i })).toHaveCount(0);

    // The key in that link can't edit, ask for a code, or delete (AC-0007-04).
    const key = new URL(watchLink).hash.replace("#k=", "");
    const asWatcher = {
      origin: baseURL ?? "",
      authorization: `Bearer ${key}`,
      "x-forwarded-for": uniqueClient(),
    };
    const edit = await editGame(request, baseURL ?? "", shared, { type: "startGame" }, key);
    expect(edit.status()).toBe(403);
    const code = await request.post(`/api/games/${shared.id}/code`, { headers: asWatcher });
    expect(code.status()).toBe(403);
    const removed = await request.delete(`/api/games/${shared.id}`, { headers: asWatcher });
    expect(removed.status()).toBe(403);

    // Showing links changed nothing in the game (AC-0007-07).
    expect(await revOf()).toBe(before);
    for (const page of [host, guest, third]) await page.context().close();
  });

  test("AC-0007-06, -08: a device on an older edit link says why, and its edit link still works", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    // An edit link from before this change: the edit key alone.
    await openShared(page, shared.id, shared.editKey);
    await expect(page.getByRole("button", { name: "Add a buy-in for Player 1" })).toBeVisible();
    await page.getByRole("button", { name: "Share" }).click();
    await expect(sheet(page).getByText(/joined with an older edit link/)).toBeVisible();
    await expect(sheet(page).getByText(/Only the device that started sharing/)).toHaveCount(0);
    await expect(sheet(page).getByRole("img")).toHaveCount(0);
    await sheet(page)
      .getByRole("radio", { name: /Can edit/ })
      .check();
    expect(await linkText(page)).toContain(`/g/${shared.id}#k=${shared.editKey}`);
    expect(await linkText(page)).not.toContain("&w=");
  });

  test("AC-0007-09: a browser on iPhone says the home-screen app keeps its games apart; elsewhere it says nothing", async ({
    browser,
  }) => {
    const phrase = /share from the one you'll keep using/;
    const inBrowserOnIphone = await (await browser.newContext()).newPage();
    await inBrowserOnIphone.addInitScript(() => {
      Object.defineProperty(navigator, "standalone", { value: false, configurable: true });
    });
    await asDevice(inBrowserOnIphone);
    await openFresh(inBrowserOnIphone);
    await startGame(inBrowserOnIphone);
    await inBrowserOnIphone.getByRole("button", { name: "Share" }).click();
    await expect(sheet(inBrowserOnIphone).getByText(phrase)).toBeVisible();

    const homeScreenApp = await (await browser.newContext()).newPage();
    await homeScreenApp.addInitScript(() => {
      Object.defineProperty(navigator, "standalone", { value: true, configurable: true });
    });
    await asDevice(homeScreenApp);
    await openFresh(homeScreenApp);
    await startGame(homeScreenApp);
    await homeScreenApp.getByRole("button", { name: "Share" }).click();
    await expect(sheet(homeScreenApp).getByText(/24 hours/)).toBeVisible();
    await expect(sheet(homeScreenApp).getByText(phrase)).toHaveCount(0);
    for (const page of [inBrowserOnIphone, homeScreenApp]) await page.context().close();
  });
});
