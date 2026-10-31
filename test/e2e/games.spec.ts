import { expect, type Page, test } from "@playwright/test";

import {
  asDevice,
  editGame,
  holdGames,
  openShared,
  shareGame,
  uniqueClient,
} from "./shared-helpers";

const title = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });
const games = (page: Page) => page.getByRole("dialog", { name: "Games" });

async function nameFirstPlayer(
  request: Parameters<typeof editGame>[0],
  baseURL: string,
  shared: Awaited<ReturnType<typeof shareGame>>,
  name: string,
) {
  const snapshot = (await (
    await request.get(`/api/games/${shared.id}`, {
      headers: { authorization: `Bearer ${shared.editKey}`, "x-forwarded-for": uniqueClient() },
    })
  ).json()) as { game: { players: { id: string }[] } };
  const response = await editGame(request, baseURL, shared, {
    type: "setName",
    playerId: snapshot.game.players[0]?.id ?? "",
    name,
  });
  expect(response.status()).toBe(200);
}

test.describe("SPEC-0003 Games, archived games and delete", () => {
  test("AC-0003-14: switch between two games at the step each was left on, and leave one on this device only", async ({
    page,
    request,
    baseURL,
  }) => {
    const first = await shareGame(request, baseURL ?? "");
    const second = await shareGame(request, baseURL ?? "");
    await nameFirstPlayer(request, baseURL ?? "", first, "Ana");
    await nameFirstPlayer(request, baseURL ?? "", second, "Ben");
    await holdGames(page, [first, second]);

    await page.goto(`/g/${first.id}`);
    await expect(title(page, "At the table")).toBeVisible();
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(title(page, "Settle up")).toBeVisible();

    await page.getByRole("button", { name: "Games" }).click();
    await expect(games(page)).toContainText("Ana");
    await games(page)
      .getByRole("button", { name: /^Open (Shared game|Ben)/ })
      .click();
    await expect(title(page, "At the table")).toBeVisible();
    await expect(page.getByText("Ben", { exact: true }).first()).toBeVisible();

    // Back in the first game, it is where it was left (REQ-0003-18).
    await page.getByRole("button", { name: "Games" }).click();
    await games(page).getByRole("button", { name: "Open Ana" }).click();
    await expect(title(page, "Settle up")).toBeVisible();

    // Leaving the other game takes it off this device; it is still there for everyone else.
    await page.getByRole("button", { name: "Games" }).click();
    await games(page).getByRole("button", { name: "Leave Ben" }).click();
    await games(page).getByRole("button", { name: "Leave Ben" }).last().click();
    await expect(games(page)).not.toContainText("Ben");
    const stillThere = await request.get(`/api/games/${second.id}`, {
      headers: { authorization: `Bearer ${second.editKey}`, "x-forwarded-for": uniqueClient() },
    });
    expect(stillThere.status()).toBe(200);
  });

  test("AC-0003-16: an editor deletes a game for everyone, and the other device shows it is gone", async ({
    browser,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    const a = await browser.newPage();
    const b = await browser.newPage();
    await openShared(a, shared.id, shared.editKey);
    await openShared(b, shared.id, shared.watchKey);
    await expect(title(a, "At the table")).toBeVisible();
    await expect(title(b, "At the table")).toBeVisible();

    await a.getByRole("button", { name: "Games" }).click();
    await games(a).getByRole("button", { name: "Delete for everyone" }).click();
    await expect(games(a).getByText(/nobody can open it again/)).toBeVisible();
    await games(a).getByRole("button", { name: "Delete the game" }).click();
    await expect(a).toHaveURL(/\/$/);

    await expect(b.getByRole("heading", { level: 1, name: /isn.t available/ })).toBeVisible({
      timeout: 15_000,
    });
    const gone = await request.get(`/api/games/${shared.id}`, {
      headers: { authorization: `Bearer ${shared.editKey}`, "x-forwarded-for": uniqueClient() },
    });
    expect(gone.status()).toBe(404);
    await a.close();
    await b.close();
  });

  test("a watcher is not offered delete", async ({ page, request, baseURL }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible();
    await page.getByRole("button", { name: "Games" }).click();
    await expect(games(page)).toBeVisible();
    await expect(games(page).getByRole("button", { name: "Delete for everyone" })).toHaveCount(0);
  });

  test("AC-0003-15: an archived game is read-only with an Archived notice, and can be duplicated into a new game", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await asDevice(page);
    // The server archives after 24 hours; the browser is shown that state for this game.
    await page.route(`**/api/games/${shared.id}*`, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      const body = (await response.json()) as Record<string, unknown>;
      return route.fulfill({ response, json: { ...body, archived: true, unchanged: undefined } });
    });
    await page.goto(`/g/${shared.id}#k=${shared.editKey}`);
    await expect(title(page, "At the table")).toBeVisible();
    await expect(page.getByText(/This game is archived/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Add a buy-in for Player 1" })).toHaveCount(0);

    await page.getByRole("button", { name: "Duplicate into a new game" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(title(page, "At the table")).toBeVisible();
    await expect(page.getByRole("group", { name: "Buy-ins for Player 1" })).toContainText("1");
  });
});
