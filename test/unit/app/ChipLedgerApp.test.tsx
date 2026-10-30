import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChipLedgerApp } from "@/app/ChipLedgerApp";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { STORAGE_KEY } from "@/lib/infra/game-storage";
import { requestPhotoCount } from "@/lib/infra/photo-count-client";
import { defaultGame } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/clipboard", () => ({ copyToClipboard: vi.fn() }));
vi.mock("@/lib/infra/photo-count-client", () => ({ requestPhotoCount: vi.fn() }));

const copy = vi.mocked(copyToClipboard);
const photoCount = vi.mocked(requestPhotoCount);

const button = (name: string | RegExp) => screen.getByRole("button", { name });
const heading = () => screen.getByRole("heading", { level: 1 });

function saved(overrides: Partial<ReturnType<typeof defaultGame>> = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultGame(), ...overrides }));
}

function savedGame() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as ReturnType<typeof defaultGame>;
}

describe("ChipLedgerApp", () => {
  // Start from a saved 20 USD game so these tests read in dollars; the app's own default
  // (10 EUR) is covered below, with storage emptied first.
  beforeEach(() => {
    saved();
  });

  afterEach(() => {
    copy.mockReset();
    photoCount.mockReset();
  });

  it("REQ-0001-01, -02, -08, -09: walks Setup → Table and records rebuys", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(heading()).toHaveTextContent("Setup");
    await userEvent.click(button("Start the game"));
    expect(heading()).toHaveTextContent("At the table");
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);

    await userEvent.click(button("Add a buy-in for Player 1"));
    await userEvent.click(button("Add a buy-in for Player 1"));
    expect(screen.getByText("$60.00 in")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("6 buy-ins so far.")).toBeInTheDocument();

    await userEvent.click(button("Remove a buy-in for Player 2"));
    await userEvent.click(button("Remove a buy-in for Player 2"));
    expect(screen.getByRole("status", { name: "Buy-ins for Player 2" })).toHaveTextContent("0");
  });

  it("REQ-0001-02: reopening the current step scrolls to the top", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    vi.mocked(window.scrollTo).mockClear();
    await userEvent.click(button("1 Setup"));
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("AC-0001-15: Fill the chips rebalances a hand-edited stack for the buy-in", async () => {
    saved({ autoChips: false, buyIn: 40 });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Fill the chips to match the buy-in" }),
    );
    expect(screen.getByLabelText("White chip value")).toHaveValue("0.5");
    expect(screen.getByText(/The chips adjust to the buy-in/)).toBeInTheDocument();
    expect(savedGame().autoChips).toBe(true);
  });

  it("REQ-0001-05: adds a chip color with a new row", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(button("Add a chip color"));
    expect(screen.getByLabelText("Green chips per player")).toHaveValue("5");
  });

  it("REQ-0001-25: restores a saved game and saves every change", async () => {
    saved({ screen: "table" });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(await screen.findByRole("heading", { name: "At the table" })).toBeInTheDocument();
    await userEvent.click(button("Add a buy-in for Player 3"));
    expect(savedGame().players[2]?.buyins).toBe(2);
  });

  it("AC-0001-11: falls back to defaults when the saved game is invalid", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, '{"players":"oops"}');
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(heading()).toHaveTextContent("Setup");
    expect(savedGame()).toMatchObject({ buyIn: 10, currency: "EUR" });
  });

  it("REQ-0001-26: a first visit starts with 10 EUR and balanced chips", () => {
    localStorage.clear();
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(screen.getByLabelText("Buy-in amount")).toHaveValue("10");
    expect(screen.getByLabelText("Currency")).toHaveValue("EUR");
    expect(screen.getByLabelText("White chips per player")).toHaveValue("22");
    expect(screen.getByLabelText("White chip value")).toHaveValue("0.1");
    expect(screen.getByLabelText("Blue chip value")).toHaveValue("0.4");
    expect(screen.getByText(/matching the buy-in/)).toBeInTheDocument();
  });

  it("AC-0001-05, AC-0001-08: types counts with no photo controls when photo counting is off", async () => {
    saved({ screen: "cashout" });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await screen.findByRole("heading", { name: "Cash out" });
    expect(screen.queryByText(/Take photo/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Type each player's chip counts, then check the count below."),
    ).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("White chips for Player 1"), "40");
    const card = screen.getByRole("region", { name: "Player 1" });
    expect(within(card).getByText("$10.00")).toBeInTheDocument();
    const whiteRow = screen.getByRole("cell", { name: "White" }).closest("tr");
    // AC-0002-14: the mismatch is stated in visible words.
    expect(whiteRow).toHaveTextContent("40 of 80 · 40 short");
    expect(screen.getByText(/\$70\.00 less than the \$80\.00 pot/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("White chips for Player 1"));
    expect(savedGame().players[0]?.counts).toEqual({});
  });

  it("AC-0001-14: cash out uses one All colors count per player in one-value mode", async () => {
    saved({ screen: "cashout", uniformValue: true, uniformChip: { count: 40, value: 0.5 } });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await screen.findByRole("heading", { name: "Cash out" });
    expect(screen.queryByLabelText("White chips for Player 1")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Type how many chips each player has.*Colors don't matter\./),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Chips for Player 1"), "40");
    expect(
      within(screen.getByRole("region", { name: "Player 1" })).getByText("$20.00"),
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "All colors" }).closest("tr")).toHaveTextContent(
      "40 of 160",
    );
  });

  it("AC-0001-09: fills counts from a photo and shows the confidence", async () => {
    saved({ screen: "cashout" });
    photoCount.mockResolvedValue({
      ok: true,
      result: { counts: { white: 4, red: 0, blue: 0 }, confidence: "medium", note: "Blurry" },
    });
    render(<ChipLedgerApp photoCountingEnabled />);
    await screen.findByRole("heading", { name: "Cash out" });

    const photo = new File(["x"], "chips.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Take photo of Player 1's chips"), photo);
    expect(photoCount).toHaveBeenCalledWith(photo, [
      { color: "white", issued: 80 },
      { color: "red", issued: 40 },
      { color: "blue", issued: 40 },
    ]);
    expect(
      await screen.findByText(
        "Counted from the photo with medium confidence. Check the numbers below. Blurry",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("White chips for Player 1")).toHaveValue("4");
    expect(screen.getByRole("img", { name: "Photo of Player 1's chips" })).toBeInTheDocument();
    expect(screen.getByText("Retake photo")).toBeInTheDocument();

    // AC-0002-03: the name starts with the visible text.
    expect(screen.getByLabelText("Retake photo of Player 1's chips")).toBeInTheDocument();
    // REQ-0002-07: the result is announced by the page's live region, with the player's name.
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "Player 1: Counted from the photo with medium confidence.",
    );

    photoCount.mockResolvedValue({ ok: false, code: "rate_limited" });
    await userEvent.upload(screen.getByLabelText("Retake photo of Player 1's chips"), photo);
    expect(
      await screen.findByText(
        "Too many requests right now. Wait a minute and try again, or type the counts.",
      ),
    ).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("REQ-0001-14: disables the photo control while counting", async () => {
    saved({ screen: "cashout" });
    let finish: (value: Awaited<ReturnType<typeof requestPhotoCount>>) => void = () => undefined;
    photoCount.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<ChipLedgerApp photoCountingEnabled />);
    await screen.findByRole("heading", { name: "Cash out" });
    const input = screen.getByLabelText("Take photo of Player 2's chips");
    await userEvent.upload(input, new File(["x"], "a.png", { type: "image/png" }));
    expect(screen.getByText("Counting…")).toBeInTheDocument();
    expect(input).toHaveAccessibleName("Counting… Player 2's chips");
    expect(screen.getByText("Counting chips. This can take up to a minute.")).toBeInTheDocument();
    expect(input).toBeDisabled();
    await act(async () => {
      finish({ ok: false, code: "failed" });
      await Promise.resolve();
    });
    expect(
      screen.getByText("Photo counting failed. Try again or type the counts."),
    ).toBeInTheDocument();
  });

  it("REQ-0001-18 … -22: settles, toggles spreading, and copies results", async () => {
    const game = defaultGame();
    const blues = [35, 25, 10, 0];
    saved({
      screen: "settle",
      players: game.players.map((p, i) => ({
        ...p,
        name: ["Ana", "Ben", "Cy", "Dee"][i] ?? "",
        counts: { blue: blues[i] ?? 0 },
      })),
    });
    copy.mockResolvedValue(true);
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await screen.findByRole("heading", { name: "Settle up" });

    expect(
      screen.getByText("The counted chips are $10.00 short of the $80.00 pot."),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Dee pays Ana$20.00");
    await userEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByText(/leave \$10\.00 unaccounted for/)).toBeInTheDocument();
    expect(screen.getByText("+$15.00")).toBeInTheDocument();

    await userEvent.click(button("Copy results"));
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("Ana: +$15.00"));
    expect(button("Copied")).toBeInTheDocument();
  });

  it("AC-0001-12: shows the results text when the clipboard fails", async () => {
    saved({ screen: "settle" });
    copy.mockResolvedValue(false);
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy results" }));
    const results = screen.getByRole("textbox", { name: "Results text" });
    expect((results as HTMLTextAreaElement).value).toContain("Payments:");
    expect(screen.getByText("Select the text above and copy it.")).toBeInTheDocument();
    await userEvent.click(button("Back to Setup"));
    expect(heading()).toHaveTextContent("Setup");
    await userEvent.click(button("4 Settle"));
    expect(screen.queryByRole("textbox", { name: "Results text" })).not.toBeInTheDocument();
  });

  it("REQ-0001-23: starts a new game with the same players", async () => {
    saved({
      screen: "settle",
      players: defaultGame().players.map((p) => ({
        ...p,
        name: "Zed",
        buyins: 3,
        counts: { red: 2 },
      })),
    });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    // REQ-0002-12: the bottom bar's primary action on Settle.
    await userEvent.click(await screen.findByRole("button", { name: "New game, same players" }));
    expect(heading()).toHaveTextContent("At the table");
    expect(savedGame().players[0]).toMatchObject({ name: "Zed", buyins: 1, counts: {} });
  });

  it("AC-0002-11: start over asks in place, Cancel and Esc return focus, leaving closes it", async () => {
    saved({ screen: "settle", buyIn: 50 });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    const startOver = await screen.findByRole("button", { name: "Start over from scratch" });
    await userEvent.click(startOver);
    const confirm = screen.getByRole("group", {
      name: "Erase everything? Names, chips, and buy-ins will be cleared.",
    });
    expect(within(confirm).getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(savedGame().buyIn).toBe(50);

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: /Erase everything/ })).not.toBeInTheDocument();
    expect(button("Start over from scratch")).toHaveFocus();

    await userEvent.click(button("Start over from scratch"));
    await userEvent.click(button("Cancel"));
    expect(button("Start over from scratch")).toHaveFocus();
    expect(savedGame().buyIn).toBe(50);

    await userEvent.click(button("Start over from scratch"));
    await userEvent.click(button("Back to Cash out"));
    await userEvent.click(button("Settle up"));
    expect(screen.queryByRole("group", { name: /Erase everything/ })).not.toBeInTheDocument();

    await userEvent.click(button("Start over from scratch"));
    await userEvent.click(button("Erase everything"));
    expect(heading()).toHaveTextContent("Setup");
    expect(savedGame().buyIn).toBe(10);
  });

  it("AC-0001-19: the theme button cycles, applies, saves, and survives Start over", async () => {
    saved({ screen: "settle" });
    localStorage.setItem("chip-ledger.theme", "light");
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(await screen.findByRole("button", { name: "Theme: Light" })).toBeInTheDocument();

    await userEvent.click(button("Theme: Light"));
    expect(button("Theme: Dark")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("chip-ledger.theme")).toBe("dark");

    await userEvent.click(button("Start over from scratch"));
    await userEvent.click(button("Erase everything"));
    expect(localStorage.getItem("chip-ledger.theme")).toBe("dark");
    expect(button("Theme: Dark")).toBeInTheDocument();

    await userEvent.click(button("Theme: Dark"));
    expect(button("Theme: System")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    delete document.documentElement.dataset.theme;
  });

  it("REQ-0001-02: shows each step's bottom actions", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(button("2 Table"));
    await userEvent.click(button("Back to Setup"));
    expect(heading()).toHaveTextContent("Setup");
    await userEvent.click(button("3 Cash out"));
    await userEvent.click(button("Back to Table"));
    expect(heading()).toHaveTextContent("At the table");
    await userEvent.click(button("4 Settle"));
    await userEvent.click(button("Back to Cash out"));
    expect(heading()).toHaveTextContent("Cash out");
  });

  it("AC-0002-12: Settle's bottom bar goes back to Cash out or starts the next game", async () => {
    saved({ screen: "settle" });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await screen.findByRole("heading", { name: "Settle up" });
    expect(screen.queryByRole("button", { name: "New game with the same players" })).toBeNull();
    // AC-0002-22: visible "‹ Cash out", named "Back to Cash out".
    expect(button("Back to Cash out")).toHaveTextContent("‹ Cash out");
    expect(button("New game, same players")).toBeInTheDocument();
    await userEvent.click(button("Back to Setup"));
    expect(heading()).toHaveTextContent("Setup");
  });

  it("AC-0002-13: Table − is unavailable at 0 buy-ins but keeps focus", async () => {
    saved({ screen: "table" });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    const remove = await screen.findByRole("button", { name: "Remove a buy-in for Player 1" });
    expect(remove).toHaveAttribute("aria-disabled", "false");
    await userEvent.click(remove);
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(remove).toHaveFocus();
    await userEvent.click(remove);
    expect(screen.getByRole("status", { name: "Buy-ins for Player 1" })).toHaveTextContent("0");
  });
});

describe("ChipLedgerApp: SPEC-0002 phase 1 accessibility", () => {
  const announcer = () => screen.getByRole("status", { name: "" });

  beforeEach(() => {
    saved();
  });

  afterEach(() => {
    copy.mockReset();
  });

  it("AC-0002-02: a step change moves focus to its title and names it in the document title", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    // Not on load: restoring a game must not steal focus or rename the served page.
    document.title = "Chip Ledger";
    expect(heading()).not.toHaveFocus();
    expect(document.title).toBe("Chip Ledger");

    await userEvent.click(button("Start the game"));
    expect(heading()).toHaveTextContent("At the table");
    expect(heading()).toHaveFocus();
    expect(document.title).toBe("At the table · Chip Ledger");

    await userEvent.click(button("3 Cash out"));
    expect(heading()).toHaveFocus();
    expect(document.title).toBe("Cash out · Chip Ledger");

    // Reopening the current step also lands on its title.
    await userEvent.click(button("3 Cash out"));
    expect(heading()).toHaveFocus();
  });

  it("AC-0002-07: announces the player count and rebuys in words, not the bare number", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(announcer()).toHaveTextContent(/^$/);
    await userEvent.click(button("More players"));
    expect(announcer()).toHaveTextContent("5 players");

    await userEvent.click(button("Start the game"));
    await userEvent.click(button("Add a buy-in for Player 1"));
    expect(announcer()).toHaveTextContent("Player 1: 2 buy-ins, pot $120.00");
  });

  it("AC-0002-07: announces the Setup summary only when its message changes", async () => {
    // A hand-edited stack, so changing the buy-in does not rebalance the chips.
    saved({ autoChips: false });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    const buyIn = screen.getByLabelText("Buy-in amount");
    await userEvent.clear(buyIn);
    expect(announcer()).toHaveTextContent("Enter a buy-in amount.");
    await userEvent.type(buyIn, "2");
    expect(announcer()).toHaveTextContent(
      /^The stack adds up to \$20\.00 but the buy-in is \$2\.00/,
    );
    // More digits change only the amounts, so nothing new is announced.
    await userEvent.type(buyIn, "5");
    expect(announcer()).toHaveTextContent("the buy-in is $2.00");
  });

  it("AC-0002-07: announces copying the results", async () => {
    saved({ screen: "settle" });
    copy.mockResolvedValue(true);
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy results" }));
    expect(announcer()).toHaveTextContent("Results copied.");
  });

  it("AC-0002-08: an unusable Start the game stays focusable, says why, and leads to the field", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    const buyIn = screen.getByLabelText("Buy-in amount");
    await userEvent.clear(buyIn);
    expect(buyIn).toHaveAttribute("aria-invalid", "true");

    const start = button("Start the game");
    expect(start).toBeEnabled();
    expect(start).toHaveAttribute("aria-disabled", "true");
    expect(start).toHaveAccessibleDescription("Enter a buy-in amount.");
    await userEvent.click(start);
    expect(heading()).toHaveTextContent("Setup");
    expect(buyIn).toHaveFocus();

    // With a buy-in but an empty stack, it leads to the first chip count.
    await userEvent.type(buyIn, "20");
    expect(buyIn).toHaveAttribute("aria-invalid", "false");
    for (const color of ["White", "Red", "Blue"]) {
      await userEvent.clear(screen.getByLabelText(`${color} chips per player`));
    }
    await userEvent.click(start);
    expect(screen.getByLabelText("White chips per player")).toHaveFocus();
  });

  it("AC-0002-01: every count cell on Cash out names its color in visible text", async () => {
    saved({ screen: "cashout" });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    const card = await screen.findByRole("region", { name: "Player 1" });
    for (const color of ["White", "Red", "Blue"]) {
      const input = within(card).getByLabelText(`${color} chips for Player 1`);
      expect(input.closest("label")).toHaveTextContent(color);
    }
  });

  it("AC-0002-06: the copy-fallback field has a 3:1 control border", async () => {
    saved({ screen: "settle" });
    copy.mockResolvedValue(false);
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Copy results" }));
    expect(screen.getByRole("textbox", { name: "Results text" })).toHaveClass(
      "border-border-control",
    );
  });
});

describe("ChipLedgerApp: SPEC-0002 phase 3 consistency", () => {
  beforeEach(() => {
    saved();
  });

  it("AC-0002-21: every step's heading is its name; Setup shows the app name as a brand line", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(heading()).toHaveTextContent(/^Setup$/);
    const brand = screen.getByText("Chip Ledger");
    expect(brand.tagName).toBe("P");
    for (const [step, title] of [
      ["2 Table", "At the table"],
      ["3 Cash out", "Cash out"],
      ["4 Settle", "Settle up"],
    ] as const) {
      await userEvent.click(button(step));
      expect(heading()).toHaveTextContent(new RegExp(`^${title}$`));
    }
  });

  it("AC-0002-22: bottom-bar back buttons show ‹ and are named Back to <step>", async () => {
    saved({ screen: "table" });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    const back = await screen.findByRole("button", { name: "Back to Setup" });
    expect(back).toHaveTextContent("‹ Setup");
    expect(button("Cash out")).toBeInTheDocument();
    await userEvent.click(button("3 Cash out"));
    expect(button("Back to Table")).toHaveTextContent("‹ Table");
    expect(button("Settle up")).toBeInTheDocument();
  });
});
