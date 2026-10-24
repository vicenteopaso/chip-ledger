import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { enterCounts, openFresh, playToSettle, SHORT_COUNTS, startGame } from "../e2e/helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`AC-0001-13: axe, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("setup, including the stack warning", async ({ page }) => {
      await openFresh(page);
      await expectNoViolations(page);
      await page.getByLabel("White chips per player").fill("21");
      await expect(page.getByText(/The stack adds up to/)).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole("checkbox", { name: "Use one value for all chips" }).check();
      await expect(page.getByLabel("Value of every chip")).toBeVisible();
      await expectNoViolations(page);
    });

    test("setup with ten players", async ({ page }) => {
      await openFresh(page);
      for (let i = 0; i < 6; i += 1)
        await page.getByRole("button", { name: "More players" }).click();
      await expect(page.getByLabel("Name of player 10")).toBeVisible();
      await expectNoViolations(page);
    });

    test("table", async ({ page }) => {
      await openFresh(page);
      await startGame(page);
      await expectNoViolations(page);
    });

    test("cash out, with mismatched counts", async ({ page }) => {
      await openFresh(page);
      await startGame(page);
      await page.getByRole("button", { name: "Cash out", exact: true }).click();
      await enterCounts(page, SHORT_COUNTS);
      await expectNoViolations(page);
    });

    test("settle, with the mismatch notice and armed reset", async ({ page }) => {
      await playToSettle(page);
      await page.getByRole("button", { name: "Start over from scratch" }).click();
      await expectNoViolations(page);
    });
  });
}
