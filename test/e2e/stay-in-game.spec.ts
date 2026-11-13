import { expect, type Page, test } from "@playwright/test";

import { NAMES, openFresh, startGame } from "./helpers";
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

/** Shares the game on screen from the device's own game, as the host does at the table. */
async function shareFromOwnGame(page: Page) {
  await page.getByRole("button", { name: "Share" }).click();
  await expect(sheet(page).getByText(/You keep playing in the shared game/)).toBeVisible();
  await sheet(page).getByRole("button", { name: "Create the link" }).click();
  await expect(page).toHaveURL(/\/g\/[\w-]+$/, { timeout: 10_000 });
  await page.keyboard.press("Escape");
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

test.describe("SPEC-0006 shared games that stay shared", () => {
  test("AC-0006-01, -05: after sharing, the home address reopens the shared game, not a copy", async ({
    page,
  }) => {
    await asDevice(page);
    await openFresh(page);
    await startGame(page);
    const id = await shareFromOwnGame(page);
    await expect(title(page, "At the table")).toBeVisible();

    // Opening the app again (the installed app's icon opens the home address).
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`/g/${id}$`));
    await expect(title(page, "At the table")).toBeVisible();
    await page.getByRole("button", { name: "Share" }).click();
    await expect(sheet(page).getByTestId("share-link")).toContainText(`/g/${id}#k=`);
    await expect(sheet(page).getByRole("button", { name: "Create the link" })).toHaveCount(0);
  });

  test("AC-0006-02, -05, -06: the device's own game starts empty, appears once, and opens next once chosen", async ({
    page,
  }) => {
    await asDevice(page);
    await openFresh(page);
    await startGame(page);
    await shareFromOwnGame(page);

    await page.getByRole("button", { name: "Games" }).click();
    const games = page.getByRole("dialog", { name: "Games" });
    // The list names a game by its first three players (REQ-0003-17).
    const sharedTitle = `${NAMES.slice(0, 3).join(", ")} and 1 more`;
    await expect(games.getByText(sharedTitle, { exact: true })).toHaveCount(1);
    await games.getByRole("button", { name: /^Open Game with/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(title(page, "Setup")).toBeVisible();
    await expect(page.getByLabel("Player 1 name")).toHaveValue("");
    await page.getByRole("button", { name: "Share" }).click();
    await expect(sheet(page).getByRole("button", { name: "Create the link" })).toBeVisible();

    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(title(page, "Setup")).toBeVisible();
  });

  test("AC-0006-03: a reopened game that was deleted falls back to the device's own game, with no error page", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.editKey);
    await expect(title(page, "At the table")).toBeVisible();
    const removed = await request.delete(`/api/games/${shared.id}`, {
      headers: { origin: baseURL ?? "", authorization: `Bearer ${shared.editKey}` },
    });
    expect(removed.status()).toBe(204);

    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(title(page, "Setup")).toBeVisible();
    await expect(page.getByRole("heading", { name: /isn’t available/ })).toHaveCount(0);
  });

  test("AC-0006-04: a device that never shared opens its own game and asks the sharing service nothing", async ({
    page,
  }) => {
    const calls: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/games")) calls.push(r.url());
    });
    await openFresh(page);
    await startGame(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(title(page, "At the table")).toBeVisible();
    expect(calls).toEqual([]);
  });

  test("AC-0006-09: a refused check waits as long as asked and shows Reconnecting, not Offline", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    let refuse = false;
    let refusedAt = 0;
    const checks: number[] = [];
    await page.route(`**/api/games/${shared.id}*`, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      checks.push(Date.now());
      if (!refuse) return route.continue();
      refusedAt = Date.now();
      refuse = false;
      return route.fulfill({
        status: 429,
        headers: { "Retry-After": "6", "content-type": "application/problem+json" },
        body: JSON.stringify({ type: "rate_limited", title: "Too many requests.", status: 429 }),
      });
    });
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible();
    refuse = true;
    await expect(page.getByText("Reconnecting…")).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/^Offline/)).toHaveCount(0);
    await expect(page.getByText("1 phone live")).toBeVisible({ timeout: 10_000 });
    const next = checks.find((at) => at > refusedAt) ?? 0;
    expect(next - refusedAt).toBeGreaterThanOrEqual(5900);
  });

  test("AC-0006-12: everyone stays in the game when the host shares again and a guest drops offline", async ({
    browser,
    request,
    baseURL,
  }) => {
    // Two devices, an offline spell and a catch-up: longer than the default 30 s.
    test.setTimeout(60_000);
    const shared = await shareGame(request, baseURL ?? "");
    const host = await (await browser.newContext()).newPage();
    const guest = await (await browser.newContext()).newPage();
    // The host's device holds both keys, as after "Create the link".
    await openAsHost(host, shared);
    await expect(sheet(host)).toBeVisible();
    await host.keyboard.press("Escape");
    await expect(sheet(host)).toBeHidden();
    await openShared(guest, shared.id, shared.watchKey);
    await expect(title(guest, "At the table")).toBeVisible();

    // The host opens Share again: still the same game, no new one.
    await host.getByRole("button", { name: "Share" }).click();
    await expect(sheet(host).getByTestId("share-link")).toContainText(`/g/${shared.id}#k=`);
    await host.keyboard.press("Escape");
    await expect(sheet(host)).toBeHidden();

    await guest.context().setOffline(true);
    await expect(guest.getByText(/^(Offline\.|Reconnecting…)/)).toBeVisible({ timeout: 15_000 });
    const players = (await (
      await request.get(`/api/games/${shared.id}`, {
        headers: { authorization: `Bearer ${shared.watchKey}`, "x-forwarded-for": uniqueClient() },
      })
    ).json()) as { game: { players: { id: string }[] } };
    const edit = await editGame(request, baseURL ?? "", shared, {
      type: "setName",
      playerId: players.game.players[0]?.id ?? "",
      name: "Ana",
    });
    expect(edit.status()).toBe(200);
    await guest.context().setOffline(false);
    await guest.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(guest.getByText("Ana", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(guest.getByText(/phones? live$/)).toBeVisible();

    // Reopening the app on either device brings it back to the same game.
    for (const page of [host, guest]) {
      await page.goto("/");
      await expect(page).toHaveURL(new RegExp(`/g/${shared.id}$`));
    }
    await host.context().close();
    await guest.context().close();
  });
});
