import { expect, test } from "@playwright/test";

import { openFresh, startGame } from "./helpers";

test.describe("Share results (SPEC-0001 REQ-0001-33)", () => {
  test("AC-0001-20: Settle offers Share results where there is a share menu, with the results text", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { shared: unknown[] }).shared = [];
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: (data: unknown) => {
          (window as unknown as { shared: unknown[] }).shared.push(data);
          return Promise.resolve();
        },
      });
    });
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await page.getByRole("button", { name: "Settle up" }).click();
    await page.getByRole("button", { name: "Share results" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Results shared." })).toHaveCount(1);
    const shared = await page.evaluate(
      () => (window as unknown as { shared: { title: string; text: string }[] }).shared,
    );
    expect(shared).toHaveLength(1);
    expect(shared[0]?.title).toBe("Poker night results");
    expect(shared[0]?.text).toContain("Pot");
  });

  test("AC-0001-20: there is no Share results button without a share menu", async ({ page }) => {
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(page.getByRole("button", { name: "Copy results" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share results" })).toHaveCount(0);
  });
});
