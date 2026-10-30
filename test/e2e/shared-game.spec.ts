import { expect, type Page, test } from "@playwright/test";

import { openFresh, startGame } from "./helpers";
import { asDevice, editGame, openShared, shareGame, uniqueClient } from "./shared-helpers";

const title = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

test.describe("SPEC-0003 shared games: watching", () => {
  test("REQ-0003-04, -05: a link opens the game and the key never travels in a URL", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    const urls: string[] = [];
    page.on("request", (r) => urls.push(r.url()));
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible({ timeout: 5000 });
    expect(page.url()).not.toContain(shared.watchKey);
    expect(new URL(page.url()).hash).toBe("");
    expect(urls.filter((url) => url.includes(shared.watchKey))).toEqual([]);
    expect(urls.some((url) => url.includes(`/api/games/${shared.id}`))).toBe(true);
    await expect(page.getByText(/^Watch only/)).toBeVisible();
    // The first check is also a heartbeat, so this device counts itself.
    await expect(page.getByText("Live · 1 here")).toBeVisible();
  });

  test("REQ-0003-04: a reload still opens the game, from the remembered key", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible();
    await page.reload();
    await expect(title(page, "At the table")).toBeVisible();
  });

  test("REQ-0003-06: a watcher can look at every step and change nothing", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible();
    await expect(page.getByRole("button", { name: /buy-in for/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Back to Setup" }).click();
    await expect(title(page, "Setup")).toBeVisible();
    await expect(page.getByLabel("Player 1 name")).toHaveAttribute("readonly", "");
    await expect(page.getByLabel("Currency")).toBeDisabled();
    await expect(page.getByRole("button", { name: /fill the chips|add a chip/i })).toHaveCount(0);

    await page.getByRole("button", { name: "See the table" }).click();
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await expect(page.getByLabel("White chips for Player 1")).toHaveAttribute("readonly", "");
    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(title(page, "Settle up")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy results" })).toBeEnabled();
    await expect(page.getByRole("button", { name: /start over|new game/i })).toHaveCount(0);
  });

  test("REQ-0003-06: the server refuses an edit a watcher forges", async ({ request, baseURL }) => {
    const shared = await shareGame(request, baseURL ?? "");
    const response = await editGame(
      request,
      baseURL ?? "",
      shared,
      { type: "setName", playerId: "e1", name: "Mallory" },
      shared.watchKey,
    );
    expect(response.status()).toBe(403);
  });

  test("REQ-0003-10: a change an editor makes appears without reloading", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible();
    await expect(page.getByText("Player 1", { exact: true })).toBeVisible();
    const players = (await (
      await request.get(`/api/games/${shared.id}`, {
        headers: { authorization: `Bearer ${shared.watchKey}`, "x-forwarded-for": uniqueClient() },
      })
    ).json()) as { game: { players: { id: string }[] } };
    const first = players.game.players[0]?.id ?? "";
    const response = await editGame(request, baseURL ?? "", shared, {
      type: "setName",
      playerId: first,
      name: "Ana",
    });
    expect(response.status()).toBe(200);
    // The page asks every 2 s straight after a change; allow for a slow runner.
    await expect(page.getByText("Ana", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("REQ-0003-15: waits for the host, then follows everyone to the table", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "", { started: false });
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "Waiting for the host")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cash out", exact: true })).toHaveCount(0);
    const response = await editGame(request, baseURL ?? "", shared, { type: "startGame" });
    expect(response.status()).toBe(200);
    await expect(title(page, "At the table")).toBeVisible({ timeout: 10_000 });
  });

  test("REQ-0003-26: a wrong key, no key, and a deleted game look the same", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await asDevice(page);
    await page.goto(`/g/${shared.id}#k=${"B".repeat(22)}`);
    await expect(title(page, "This game isn’t available")).toBeVisible();
    const wrongKeyText = await page.getByRole("main").innerText();

    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.goto(`/g/${shared.id}`);
    await expect(title(page, "This game isn’t available")).toBeVisible();
    expect(await page.getByRole("main").innerText()).toBe(wrongKeyText);

    const removed = await request.delete(`/api/games/${shared.id}`, {
      headers: {
        origin: baseURL ?? "",
        authorization: `Bearer ${shared.editKey}`,
        "x-forwarded-for": uniqueClient(),
      },
    });
    expect(removed.status()).toBe(204);
    await page.goto(`/g/${shared.id}#k=${shared.watchKey}`);
    await expect(title(page, "This game isn’t available")).toBeVisible();
    expect(await page.getByRole("main").innerText()).toBe(wrongKeyText);
    await expect(page.getByRole("link", { name: "Start a new game" })).toHaveAttribute("href", "/");
  });

  test("a malformed address is a plain not-found page", async ({ page }) => {
    const response = await page.goto("/g/nope");
    expect(response?.status()).toBe(404);
  });

  test("REQ-0003-04: the page is never indexed and sends no referrer", async ({
    page,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    await openShared(page, shared.id, shared.watchKey);
    await expect(title(page, "At the table")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /g/");
  });
});

test.describe("SPEC-0003 shared games: solo play is unchanged", () => {
  test("REQ-0003-27: playing alone sends no request to the sharing API", async ({ page }) => {
    const urls: string[] = [];
    page.on("request", (r) => urls.push(r.url()));
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await expect(title(page, "Cash out")).toBeVisible();
    expect(urls.filter((url) => url.includes("/api/games"))).toEqual([]);
  });
});
