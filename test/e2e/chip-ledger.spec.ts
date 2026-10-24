import { expect, test } from "@playwright/test";

import { enterCounts, openFresh, playToSettle, startGame } from "./helpers";

test.describe("SPEC-0001 Chip Ledger", () => {
  test("REQ-0001-26: a first visit starts with 10 EUR and balanced chips", async ({ page }) => {
    await openFresh(page, "EUR");
    await expect(page.getByLabel("Buy-in amount")).toHaveValue("10");
    await expect(page.getByLabel("Currency")).toHaveValue("EUR");
    await expect(page.getByLabel("White chips per player")).toHaveValue("22");
    await expect(page.getByLabel("White chip value")).toHaveValue("0.1");
    await expect(page.getByLabel("Blue chip value")).toHaveValue("0.4");
    await expect(page.getByText(/matching the buy-in/)).toBeVisible();
  });

  test("AC-0001-02, -03: setup summary and start button follow buy-in and chips", async ({
    page,
  }) => {
    await openFresh(page);
    await expect(
      page.getByText("Each starting stack is worth $20.00, matching the buy-in."),
    ).toBeVisible();
    await page.getByLabel("Buy-in amount").fill("");
    await expect(page.getByText("Enter a buy-in amount.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start the game" })).toBeDisabled();
    await page.getByLabel("Buy-in amount").fill("20");
    await page.getByRole("button", { name: "Remove White" }).click();
    await page.getByRole("button", { name: "Remove Red" }).click();
    await expect(page.getByText(/cash out at 200% of the values above/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove Blue" })).toBeDisabled();
  });

  test("AC-0001-14: one value for all chips swaps the color rows for one row, kept after a reload", async ({
    page,
  }) => {
    await openFresh(page);
    await page.getByRole("checkbox", { name: "Use one value for all chips" }).check();
    await expect(page.getByLabel("Chip color")).toHaveCount(0);
    await expect(page.getByText("All colors")).toBeVisible();
    await expect(
      page.getByText("Each starting stack is worth $20.00, matching the buy-in."),
    ).toBeVisible();
    await page.getByLabel("Value of every chip").fill("1");
    await expect(
      page.getByText(/The stack adds up to \$40\.00 but the buy-in is \$20\.00/),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Use one value for all chips" })).toBeChecked();
    await expect(page.getByLabel("Value of every chip")).toHaveValue("1");

    await page.getByRole("checkbox", { name: "Use one value for all chips" }).uncheck();
    await expect(page.getByText("All colors")).toBeHidden();
    await expect(page.getByLabel("Red chip value")).toHaveValue("0.5");
  });

  test("AC-0001-15: the chips follow the buy-in until you edit one", async ({ page }) => {
    await openFresh(page);
    await page.getByLabel("Buy-in amount").fill("40");
    await expect(page.getByLabel("White chip value")).toHaveValue("0.5");
    await expect(page.getByLabel("Blue chip value")).toHaveValue("2");
    await expect(
      page.getByText("Each starting stack is worth $40.00, matching the buy-in."),
    ).toBeVisible();

    await page.getByLabel("White chips per player").fill("21");
    await expect(
      page.getByRole("button", { name: "Fill the chips to match the buy-in" }),
    ).toBeVisible();
    await page.getByLabel("Buy-in amount").fill("25");
    await expect(page.getByText(/The stack adds up to/)).toBeVisible();
    await page.getByRole("button", { name: "Fill the chips to match the buy-in" }).click();
    await expect(page.getByLabel("White chips per player")).toHaveValue("22");
    await expect(
      page.getByText("Each starting stack is worth $25.00, matching the buy-in."),
    ).toBeVisible();
  });

  test("AC-0001-16: CLP rescales the buy-in and chips and reads thousands separators", async ({
    page,
  }) => {
    await openFresh(page);
    await page.getByLabel("Currency").selectOption("CLP");
    await expect(page.getByLabel("Buy-in amount")).toHaveValue("10000");
    await expect(page.getByLabel("White chip value")).toHaveValue("100");
    await expect(page.getByLabel("White chips per player")).toHaveValue("22");
    await page.getByLabel("Buy-in amount").fill("20.000");
    await expect(page.getByLabel("White chip value")).toHaveValue("250");
    await expect(page.getByLabel("Blue chip value")).toHaveValue("1000");
    await expect(page.getByText(/matching the buy-in/)).toBeVisible();

    await page.getByRole("button", { name: "Start the game" }).click();
    await page.getByRole("button", { name: "Cash out", exact: true }).click();
    await page.getByLabel("White chips for Player 1").fill("30");
    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Settle up" })).toBeVisible();
    await expect(page.locator("body")).toContainText("CLP");
    // Whole pesos only: no hundredths anywhere on the page.
    await expect(page.locator("body")).not.toContainText(/CLP\s?[\d,]+\.\d\d/);
  });

  test("AC-0001-01, -04, -05, -06: plays a game from setup to payments", async ({ page }) => {
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Add a buy-in for Ana" }).click();
    await page.getByRole("button", { name: "Add a buy-in for Ana" }).click();
    await expect(page.getByText("$60.00 in")).toBeVisible();
    await expect(page.getByText("$120.00")).toBeVisible();
    await expect(page.getByText("6 buy-ins so far.")).toBeVisible();
    await page.getByRole("button", { name: "Remove a buy-in for Ana" }).click();

    await page
      .getByRole("navigation", { name: "Steps" })
      .getByRole("button", { name: "3 Cash out" })
      .click();
    await expect(page.getByRole("button", { name: "3 Cash out" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await enterCounts(page, {
      Ana: [40, 10, 15],
      Ben: [20, 10, 5],
      Cy: [0, 5, 10],
      Dee: [20, 5, 35],
    });
    await expect(page.getByText("Counted chips match the pot exactly.")).toBeVisible();

    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(page.getByText("Everyone broke even.")).toBeHidden();
    const payments = page.getByRole("listitem").filter({ hasText: "pays" });
    await expect(payments).toHaveText([
      "Ana pays Dee$10.00",
      "Cy pays Dee$7.50",
      "Ben pays Dee$5.00",
    ]);
  });

  test("AC-0001-11: a game survives a reload; bad saved state loads defaults", async ({ page }) => {
    await openFresh(page);
    await startGame(page);
    await page.getByRole("button", { name: "Add a buy-in for Cy" }).click();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
    await expect(page.getByText("$40.00 in")).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem("chip-ledger.v1", '{"players":"oops"}');
    });
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Chip Ledger" })).toBeVisible();
    await expect(page.getByLabel("Buy-in amount")).toHaveValue("10");
  });

  test("AC-0001-08: photo counting is hidden and its endpoint is off", async ({
    page,
    request,
  }) => {
    await openFresh(page);
    await expect(page.getByText(/from a photo/)).toBeHidden();
    await page.getByRole("button", { name: "3 Cash out" }).click();
    await expect(
      page.getByText("Type each player's chip counts, then check the count below."),
    ).toBeVisible();
    await expect(page.getByText(/photo/i)).toHaveCount(0);
    const response = await request.post("/api/photo-count", { multipart: { colors: "[]" } });
    expect(response.status()).toBe(404);
  });

  test("AC-0001-10, -12: copy falls back to text; start over needs two taps", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) },
      });
    });
    await playToSettle(page);
    await expect(
      page.getByText("The counted chips are $15.00 short of the $100.00 pot."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copy results" }).click();
    await expect(page.getByRole("textbox", { name: "Results text" })).toHaveValue(/Pot: \$100\.00/);

    await page.getByRole("button", { name: "Start over from scratch" }).click();
    await expect(page.getByRole("button", { name: "Tap again to erase everything" })).toBeVisible();
    await page.getByRole("button", { name: "Tap again to erase everything" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Chip Ledger" })).toBeVisible();
    await expect(page.getByLabel("Name of player 1")).toHaveValue("");
  });

  test("AC-0001-13: the whole flow works with the keyboard only", async ({ page }) => {
    await openFresh(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.getByLabel("Name of player 1").focus();
    await page.keyboard.type("Ana");
    await page.getByRole("button", { name: "Start the game" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
    await page.getByRole("button", { name: "Add a buy-in for Ana" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByText("$40.00 in")).toBeVisible();
    await page.getByRole("button", { name: "Cash out", exact: true }).focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("White chips for Ana").focus();
    await page.keyboard.type("80");
    await page.getByRole("button", { name: "Settle up" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Settle up" })).toBeVisible();
  });

  test("security headers and a nonce CSP are sent, with no CSP violations", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    expect(headers["content-security-policy"]).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");
    expect(headers["x-powered-by"]).toBeUndefined();
    await startGame(page);
    expect(violations).toEqual([]);
  });

  test("SEO: title, description, canonical, robots and sitemap", async ({ page, request }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Chip Ledger");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Track buy-ins/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /^https?:\/\/[^/]+\/?$/,
    );
    expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api/");
    expect((await request.get("/sitemap.xml")).ok()).toBe(true);
    expect((await request.get("/nope")).status()).toBe(404);
  });
});
