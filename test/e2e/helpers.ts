import { expect, type Page } from "@playwright/test";

export const NAMES = ["Ana", "Ben", "Cy", "Dee"] as const;

/**
 * Opens the app with empty storage, then picks USD (20 USD and its balanced chips) so flows
 * read in dollars. Pass `"EUR"` to keep the app's own default (10 EUR).
 */
export async function openFresh(page: Page, currency: "USD" | "EUR" = "USD") {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Chip Ledger" })).toBeVisible();
  if (currency !== "EUR") await page.getByLabel("Currency").selectOption(currency);
}

/** Names the four players and starts the game. */
export async function startGame(page: Page) {
  for (const [i, name] of NAMES.entries()) {
    await page.getByLabel(`Player ${String(i + 1)} name`).fill(name);
  }
  await page.getByRole("button", { name: "Start the game" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
}

/** Enters white, red, blue counts for each named player on Cash out. */
export async function enterCounts(page: Page, counts: Record<string, [number, number, number]>) {
  for (const [name, [white, red, blue]] of Object.entries(counts)) {
    await page.getByLabel(`White chips for ${name}`).fill(String(white));
    await page.getByLabel(`Red chips for ${name}`).fill(String(red));
    await page.getByLabel(`Blue chips for ${name}`).fill(String(blue));
  }
}

/** A finished game: Ana rebought once; counts are $15 short of the $100 pot. */
export const SHORT_COUNTS: Record<string, [number, number, number]> = {
  Ana: [40, 10, 15],
  Ben: [20, 10, 5],
  Cy: [0, 5, 10],
  Dee: [20, 5, 20],
};

export async function playToSettle(page: Page) {
  await openFresh(page);
  await startGame(page);
  await page.getByRole("button", { name: "Add a buy-in for Ana" }).click();
  await page.getByRole("button", { name: "Cash out", exact: true }).click();
  await enterCounts(page, SHORT_COUNTS);
  await page.getByRole("button", { name: "Settle up" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Settle up" })).toBeVisible();
}
