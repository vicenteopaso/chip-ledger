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
    await expect(page.getByRole("main").getByText(/matching the buy-in/)).toBeVisible();
  });

  test("AC-0001-17: player count steps from 2 to 10, keeps names, and loads older saves", async ({
    page,
  }) => {
    await openFresh(page);
    const players = page.getByRole("group", { name: "Number of players" });
    await expect(players).toContainText("4");
    for (let i = 0; i < 6; i += 1) await page.getByRole("button", { name: "More players" }).click();
    await expect(players).toContainText("10");
    await expect(page.getByRole("button", { name: "More players" })).toBeDisabled();
    await expect(page.getByLabel(/^Player \d+ name$/)).toHaveCount(10);
    await page.getByLabel("Player 7 name").fill("Gus");
    for (let i = 0; i < 8; i += 1)
      await page.getByRole("button", { name: "Fewer players" }).click();
    await expect(players).toContainText("2");
    await expect(page.getByRole("button", { name: "Fewer players" })).toBeDisabled();
    await expect(page.getByLabel(/^Player \d+ name$/)).toHaveCount(2);
    for (let i = 0; i < 8; i += 1) await page.getByRole("button", { name: "More players" }).click();
    await expect(page.getByLabel("Player 7 name")).toHaveValue("Gus");

    // A game saved by the first version had six player slots and a count of 4 to 6.
    await page.evaluate(() => {
      const game = JSON.parse(localStorage.getItem("chip-ledger.v1") ?? "{}") as {
        count: number;
        players: unknown[];
      };
      localStorage.setItem(
        "chip-ledger.v1",
        JSON.stringify({ ...game, count: 5, players: game.players.slice(0, 6) }),
      );
    });
    await page.reload();
    await expect(players).toContainText("5");
    await expect(page.getByLabel(/^Player \d+ name$/)).toHaveCount(5);
  });

  test("AC-0001-02, -03: setup summary and start button follow buy-in and chips", async ({
    page,
  }) => {
    await openFresh(page);
    await expect(
      page.getByRole("main").getByText("Each starting stack is worth $20.00, matching the buy-in."),
    ).toBeVisible();
    await page.getByLabel("Buy-in amount").fill("");
    await expect(page.getByRole("main").getByText("Enter a buy-in amount.")).toBeVisible();
    // REQ-0002-08: unusable but still focusable, so the reason can be found.
    await expect(page.getByRole("button", { name: "Start the game" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await page.getByLabel("Buy-in amount").fill("20");
    await page.getByRole("button", { name: "Remove White" }).click();
    await page.getByRole("button", { name: "Remove Red" }).click();
    await expect(
      page.getByRole("main").getByText(/cash out at 200% of the values above/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove Blue" })).toBeDisabled();
  });

  test("AC-0001-14: one value for all chips swaps the color rows for one row, kept after a reload", async ({
    page,
  }) => {
    await openFresh(page);
    await page.getByRole("checkbox", { name: "Use one value for all chips" }).check();
    await expect(page.getByLabel(/chip color$/)).toHaveCount(0);
    await expect(page.getByRole("main").getByText("All colors")).toBeVisible();
    await expect(
      page.getByRole("main").getByText("Each starting stack is worth $20.00, matching the buy-in."),
    ).toBeVisible();
    await page.getByLabel("Value of every chip").fill("1");
    await expect(
      page.getByRole("main").getByText(/The stack adds up to \$40\.00 but the buy-in is \$20\.00/),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Use one value for all chips" })).toBeChecked();
    await expect(page.getByLabel("Value of every chip")).toHaveValue("1");

    await page.getByRole("checkbox", { name: "Use one value for all chips" }).uncheck();
    await expect(page.getByRole("main").getByText("All colors")).toBeHidden();
    await expect(page.getByLabel("Red chip value")).toHaveValue("0.5");
  });

  test("AC-0001-15: the chips follow the buy-in until you edit one", async ({ page }) => {
    await openFresh(page);
    await page.getByLabel("Buy-in amount").fill("40");
    await expect(page.getByLabel("White chip value")).toHaveValue("0.5");
    await expect(page.getByLabel("Blue chip value")).toHaveValue("2");
    await expect(
      page.getByRole("main").getByText("Each starting stack is worth $40.00, matching the buy-in."),
    ).toBeVisible();

    await page.getByLabel("White chips per player").fill("21");
    await expect(
      page.getByRole("button", { name: "Fill the chips to match the buy-in" }),
    ).toBeVisible();
    await page.getByLabel("Buy-in amount").fill("25");
    await expect(page.getByRole("main").getByText(/The stack adds up to/)).toBeVisible();
    await page.getByRole("button", { name: "Fill the chips to match the buy-in" }).click();
    await expect(page.getByLabel("White chips per player")).toHaveValue("22");
    await expect(
      page.getByRole("main").getByText("Each starting stack is worth $25.00, matching the buy-in."),
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
    await expect(page.getByRole("main").getByText(/matching the buy-in/)).toBeVisible();

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
    await expect(page.getByRole("main").getByText("$60.00 in")).toBeVisible();
    await expect(page.getByRole("main").getByText("$120.00")).toBeVisible();
    await expect(page.getByRole("main").getByText("6 buy-ins so far.")).toBeVisible();
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
    await expect(
      page.getByRole("main").getByText("Counted chips match the pot exactly."),
    ).toBeVisible();

    await page.getByRole("button", { name: "Settle up" }).click();
    await expect(page.getByRole("main").getByText("Everyone broke even.")).toBeHidden();
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
    await expect(page.getByRole("main").getByText("$40.00 in")).toBeVisible();

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
    await expect(page.getByRole("main").getByText(/from a photo/)).toBeHidden();
    await page.getByRole("button", { name: "3 Cash out" }).click();
    await expect(
      page
        .getByRole("main")
        .getByText("Type each player's chip counts, then check the count below."),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText(/photo/i)).toHaveCount(0);
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
      page.getByRole("main").getByText("The counted chips are $15.00 short of the $100.00 pot."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Copy results" }).click();
    await expect(page.getByRole("textbox", { name: "Results text" })).toHaveValue(/Pot: \$100\.00/);

    await page.getByRole("button", { name: "Start over from scratch" }).click();
    await expect(page.getByRole("button", { name: "Tap again to erase everything" })).toBeVisible();
    await page.getByRole("button", { name: "Tap again to erase everything" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Chip Ledger" })).toBeVisible();
    await expect(page.getByLabel("Player 1 name")).toHaveValue("");
  });

  test("AC-0001-13: the whole flow works with the keyboard only", async ({ page }) => {
    await openFresh(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.getByLabel("Player 1 name").focus();
    await page.keyboard.type("Ana");
    await page.getByRole("button", { name: "Start the game" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "At the table" })).toBeVisible();
    await page.getByRole("button", { name: "Add a buy-in for Ana" }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("main").getByText("$40.00 in")).toBeVisible();
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

  test("AC-0001-18: the copyright sits under the buttons in the bottom bar on every step", async ({
    page,
  }) => {
    await openFresh(page);
    const footer = page.getByRole("contentinfo");
    const text = `© ${String(new Date().getFullYear())} Jason Johnson and Vicente Opaso`;
    for (const step of ["1 Setup", "2 Table", "3 Cash out", "4 Settle"]) {
      await page.getByRole("button", { name: step }).click();
      // Visible without scrolling, and directly below the step's main button.
      await expect(footer).toBeInViewport();
      await expect(footer).toHaveText(text);
      const main = await page.locator(".action-bar > div:first-child button").last().boundingBox();
      const note = await footer.boundingBox();
      expect(main && note && note.y >= main.y + main.height).toBe(true);
    }
  });

  test("AC-0001-19: the theme button cycles System, Light, Dark and the choice survives a reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await openFresh(page);
    const html = page.locator("html");
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await expect(page.getByRole("button", { name: "Theme: System" })).toBeVisible();
    expect(await bg()).toBe("rgb(233, 239, 234)");

    await page.getByRole("button", { name: "Theme: System" }).click();
    await expect(page.getByRole("button", { name: "Theme: Light" })).toBeVisible();
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: "Theme: Light" }).click();
    await expect(page.getByRole("button", { name: "Theme: Dark" })).toBeVisible();
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bg()).toBe("rgb(11, 38, 29)");

    await page.reload();
    // Already dark when the page first renders, with no light flash, and the button agrees.
    await expect(html).toHaveAttribute("data-theme", "dark");
    expect(await bg()).toBe("rgb(11, 38, 29)");
    await expect(page.getByRole("button", { name: "Theme: Dark" })).toBeVisible();

    await page.getByRole("button", { name: "Theme: Dark" }).click();
    await expect(page.getByRole("button", { name: "Theme: System" })).toBeVisible();
    await expect(html).not.toHaveAttribute("data-theme", /.+/);
    expect(await bg()).toBe("rgb(233, 239, 234)");

    await page.evaluate(() => {
      localStorage.setItem("chip-ledger.theme", "nonsense");
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Theme: System" })).toBeVisible();
  });

  test("no console errors or page errors while using every step and the theme button", async ({
    page,
  }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => {
      problems.push(error.message);
    });
    await openFresh(page);
    for (const theme of ["System", "Light", "Dark"]) {
      await page.getByRole("button", { name: `Theme: ${theme}` }).click();
    }
    await page.reload();
    for (const step of ["2 Table", "3 Cash out", "4 Settle", "1 Setup"]) {
      await page.getByRole("button", { name: step }).click();
    }
    expect(problems).toEqual([]);
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

test.describe("SPEC-0002 phase 1 accessibility", () => {
  test("AC-0002-02: a keyboard step change lands on the new step's title", async ({ page }) => {
    await openFresh(page);
    await startGame(page);
    // startGame clicked; repeat from the keyboard on the next step.
    await page.getByRole("button", { name: "Cash out", exact: true }).focus();
    await page.keyboard.press("Enter");
    const title = page.getByRole("heading", { level: 1, name: "Cash out" });
    await expect(title).toBeFocused();
    await expect(page).toHaveTitle("Cash out · Chip Ledger");
    // Tab continues into the step, not back to the top of the page.
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("White chips for Ana")).toBeFocused();
  });

  test("AC-0002-08: Start the game leads to the field that blocks it", async ({ page }) => {
    await openFresh(page);
    const buyIn = page.getByLabel("Buy-in amount");
    await buyIn.fill("");
    await expect(buyIn).toHaveAttribute("aria-invalid", "true");
    const start = page.getByRole("button", { name: "Start the game" });
    await start.focus();
    await expect(start).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(buyIn).toBeFocused();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chip Ledger");
  });

  test("AC-0002-10: the bottom bar never covers the focused field", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openFresh(page);
    const field = page.getByLabel("Blue chip value");
    await page.getByLabel("Blue chips per player").focus();
    await page.keyboard.press("Tab");
    await expect(field).toBeFocused();
    const fieldBox = await field.boundingBox();
    const barBox = await page.locator(".action-bar").boundingBox();
    expect(fieldBox && barBox && fieldBox.y + fieldBox.height <= barBox.y).toBe(true);
  });

  test("AC-0002-10: on a short screen the bottom bar scrolls with the page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 400 });
    await openFresh(page);
    await expect(page.locator(".action-bar")).toHaveCSS("position", "static");
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator(".action-bar")).toHaveCSS("position", "fixed");
  });
});
