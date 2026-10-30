import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { asDevice, openShared, shareGame } from "../e2e/shared-helpers";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(
    results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`AC-0003-24: axe on shared games, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test("every step of a watched game", async ({ page, request, baseURL }) => {
      const shared = await shareGame(request, baseURL ?? "");
      await openShared(page, shared.id, shared.watchKey);
      await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole("button", { name: "Back to Setup" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Setup" })).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole("button", { name: "See the table" }).click();
      await page.getByRole("button", { name: "Cash out", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Cash out" })).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole("button", { name: "Settle up" }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Settle up" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("an editor's table, setup and cash out", async ({ page, request, baseURL }) => {
      const shared = await shareGame(request, baseURL ?? "");
      await openShared(page, shared.id, shared.editKey);
      await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
      await expectNoViolations(page);
      await page.getByRole("button", { name: "Cash out", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1, name: "Cash out" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("an editor setting up before the start", async ({ page, request, baseURL }) => {
      const shared = await shareGame(request, baseURL ?? "", { started: false });
      await openShared(page, shared.id, shared.editKey);
      await expect(page.getByRole("heading", { level: 1, name: "Setup" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Start the game" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("waiting for the host", async ({ page, request, baseURL }) => {
      const shared = await shareGame(request, baseURL ?? "", { started: false });
      await openShared(page, shared.id, shared.watchKey);
      await expect(
        page.getByRole("heading", { level: 1, name: "Waiting for the host" }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test("a game that is not available", async ({ page }) => {
      await asDevice(page);
      await page.goto(`/g/abcdefghijklmnop#k=${"B".repeat(22)}`);
      await expect(
        page.getByRole("heading", { level: 1, name: "This game isn’t available" }),
      ).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
