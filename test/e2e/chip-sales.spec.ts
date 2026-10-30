import { expect, type Page, test } from "@playwright/test";

import { enterCounts, openFresh, startGame } from "./helpers";
import { openShared, shareGame } from "./shared-helpers";

async function sell(page: Page, seller: string, buyer: string, amount: string) {
  await page.getByRole("button", { name: "Sell chips" }).click();
  await page.getByRole("combobox", { name: "Seller" }).selectOption({ label: seller });
  await page.getByRole("combobox", { name: "Buyer" }).selectOption({ label: buyer });
  await page.getByRole("textbox", { name: /^Amount in/ }).fill(amount);
  await page.getByRole("button", { name: "Record sale" }).click();
}

test.describe("SPEC-0004 chip sales between players", () => {
  test("AC-0004-02, -04, -07: a sale moves money in, keeps the pot, and Settle needs no side payment", async ({
    page,
  }) => {
    await openFresh(page);
    await startGame(page);
    await sell(page, "Ana", "Ben", "5");
    const main = page.getByRole("main");
    await expect(main.getByText("$15.00 in")).toBeVisible();
    await expect(main.getByText("$25.00 in")).toBeVisible();
    await expect(main.getByText(/incl\. −\$5\.00 from chip sales/)).toBeVisible();
    await expect(main.getByText("$80.00", { exact: true })).toBeVisible();

    // The sale is kept with the game.
    await page.reload();
    await expect(page.getByRole("main").getByText("$25.00 in")).toBeVisible();

    // Everyone counts the same stack, so only the sale decides who pays whom.
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await enterCounts(page, {
      Ana: [20, 10, 10],
      Ben: [20, 10, 10],
      Cy: [20, 10, 10],
      Dee: [20, 10, 10],
    });
    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(
      page.getByRole("main").getByText("Includes chip sales between players."),
    ).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "pays" })).toHaveText([
      "Ben pays Ana$5.00",
    ]);
  });

  test("AC-0004-03, -05: a seller can go below zero, and the reverse sale clears the lines", async ({
    page,
  }) => {
    await openFresh(page);
    await startGame(page);
    await sell(page, "Ana", "Ben", "50");
    await expect(page.getByRole("main").getByText("-$30.00 in")).toBeVisible();
    await sell(page, "Ben", "Ana", "50");
    await expect(page.getByRole("main").getByText(/from chip sales/)).toHaveCount(0);
  });

  test("AC-0004-10: fewer players is not offered while a dropped player holds a sale", async ({
    page,
  }) => {
    await openFresh(page);
    await startGame(page);
    await sell(page, "Ana", "Dee", "5");
    await page.getByRole("button", { name: "1 Setup" }).click();
    await expect(page.getByText(/Fewer players isn't available while Dee/)).toBeVisible();
    await page.getByRole("button", { name: "Fewer players" }).click();
    await expect(page.getByRole("status", { name: "Number of players" })).toHaveText("4");
  });

  test("AC-0004-06, -08: another device sees the sale; a watcher cannot make one", async ({
    browser,
    request,
    baseURL,
  }) => {
    const shared = await shareGame(request, baseURL ?? "");
    const editor = await browser.newPage();
    const other = await browser.newPage();
    const watcher = await browser.newPage();
    await openShared(editor, shared.id, shared.editKey);
    await openShared(other, shared.id, shared.editKey);
    await openShared(watcher, shared.id, shared.watchKey);
    for (const page of [editor, other, watcher]) {
      await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
    }
    await sell(editor, "Player 1", "Player 2", "5");
    await expect(other.getByRole("main").getByText("€15.00 in")).toBeVisible({ timeout: 10_000 });
    await expect(watcher.getByRole("main").getByText("€5.00 in")).toBeVisible({ timeout: 10_000 });
    await expect(watcher.getByRole("button", { name: "Sell chips" })).toHaveCount(0);
    await editor.close();
    await other.close();
    await watcher.close();
  });

  test("numeric fields take no letters: buy-in, chip counts and values, cash-out counts, sale amount", async ({
    page,
  }) => {
    await openFresh(page);
    await page.getByLabel("Buy-in amount").fill("");
    await page.getByLabel("Buy-in amount").pressSequentially("a2s5d");
    await expect(page.getByLabel("Buy-in amount")).toHaveValue("25");
    await page.getByLabel("White chips per player").fill("");
    await page.getByLabel("White chips per player").pressSequentially("x1y2");
    await expect(page.getByLabel("White chips per player")).toHaveValue("12");
    await page.getByLabel("Buy-in amount").fill("20");
    await startGame(page);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await page.getByLabel("White chips for Ana").pressSequentially("q7w");
    await expect(page.getByLabel("White chips for Ana")).toHaveValue("7");
    await page.getByRole("button", { name: "2 Table" }).click();
    await page.getByRole("button", { name: "Sell chips" }).click();
    await expect(page.getByText("Amount in USD")).toBeVisible();
    await page.getByRole("textbox", { name: "Amount in USD" }).pressSequentially("asd");
    await expect(page.getByRole("textbox", { name: "Amount in USD" })).toHaveValue("");
  });
});
