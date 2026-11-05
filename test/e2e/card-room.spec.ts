import { expect, test } from "@playwright/test";

import { enterCounts, openFresh, startGame } from "./helpers";

test.describe("SPEC-0005 Card Room", () => {
  test("AC-0005-02, -03, -10: Geist type, the pot first on Table, and 44 px steps once scrolled", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 560 });
    await openFresh(page);
    await startGame(page);
    const main = page.getByRole("main");

    const family = (text: string) =>
      main
        .getByText(text, { exact: true })
        .first()
        .evaluate((element) => getComputedStyle(element).fontFamily);
    expect(await family("Ana")).toMatch(/^Geist,/);
    expect(await family("$20.00 in")).toMatch(/^"Geist Mono"/);

    // The pot panel comes before the first player.
    const pot = main.getByText("Money in the pot");
    const ana = main.getByText("Ana", { exact: true });
    const [potTop, anaTop] = await Promise.all([
      pot.evaluate((element) => element.getBoundingClientRect().top),
      ana.evaluate((element) => element.getBoundingClientRect().top),
    ]);
    expect(potTop).toBeLessThan(anaTop);
    await expect(main.getByText("4 buy-ins so far.")).toBeVisible();

    await page.evaluate(() => {
      window.scrollTo(0, 200);
    });
    await expect(page.getByRole("banner")).toHaveAttribute("data-compact", "true");
    for (const name of ["1 Setup (done)", "2 Table", "3 Cash out", "4 Settle"]) {
      const box = await page.getByRole("button", { name }).boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test("AC-0005-05, -07, -08: Settle ranks results, says the money balances, and copies in that order", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await enterCounts(page, {
      Ana: [20, 10, 10],
      Ben: [0, 0, 5],
      Cy: [0, 0, 35],
      Dee: [0, 0, 20],
    });
    await page.getByRole("button", { name: "Settle up" }).click();
    const main = page.getByRole("main");

    const results = main.getByRole("list").last().getByRole("listitem");
    await expect(results.locator("b")).toHaveText(["Cy", "Ana", "Dee", "Ben"]);
    await expect(results.first()).toContainText("In 20.00 · Out 35.00");
    await expect(main.getByText("$80.00 in, $80.00 out. Balanced.")).toBeVisible();

    await page.getByRole("button", { name: "Copy results" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Cy: +$15.00\nAna: $0.00\nDee: $0.00\nBen: -$15.00");
  });
});
