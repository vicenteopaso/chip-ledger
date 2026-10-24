import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    copy.mockReset();
    photoCount.mockReset();
  });

  it("REQ-0001-01, -02, -08, -09: walks Setup → Table and records rebuys", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    expect(heading()).toHaveTextContent("Chip Ledger");
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
    expect(heading()).toHaveTextContent("Chip Ledger");
    expect(savedGame().buyIn).toBe(20);
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
    expect(whiteRow).toHaveTextContent("40 of 80 (does not match)");
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
    await userEvent.upload(screen.getByLabelText("Take a photo of Player 1's chips"), photo);
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

    photoCount.mockResolvedValue({ ok: false, code: "rate_limited" });
    await userEvent.upload(screen.getByLabelText("Take a photo of Player 1's chips"), photo);
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
    const input = screen.getByLabelText("Take a photo of Player 2's chips");
    await userEvent.upload(input, new File(["x"], "a.png", { type: "image/png" }));
    expect(screen.getByText("Counting…")).toBeInTheDocument();
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
    await userEvent.click(button("Back to table"));
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
    await userEvent.click(
      await screen.findByRole("button", { name: "New game with the same players" }),
    );
    expect(heading()).toHaveTextContent("At the table");
    expect(savedGame().players[0]).toMatchObject({ name: "Zed", buyins: 1, counts: {} });
  });

  it("AC-0001-10: start over needs a second tap, and leaving disarms it", async () => {
    saved({ screen: "settle", buyIn: 50 });
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(await screen.findByRole("button", { name: "Start over from scratch" }));
    expect(button("Tap again to erase everything")).toBeInTheDocument();
    expect(savedGame().buyIn).toBe(50);

    await userEvent.click(button("Cash out"));
    await userEvent.click(button("Settle up"));
    expect(button("Start over from scratch")).toBeInTheDocument();

    await userEvent.click(button("Start over from scratch"));
    await userEvent.click(button("Tap again to erase everything"));
    expect(heading()).toHaveTextContent("Chip Ledger");
    expect(savedGame().buyIn).toBe(20);
  });

  it("REQ-0001-02: shows each step's bottom actions", async () => {
    render(<ChipLedgerApp photoCountingEnabled={false} />);
    await userEvent.click(button("2 Table"));
    await userEvent.click(button("Setup"));
    expect(heading()).toHaveTextContent("Chip Ledger");
    await userEvent.click(button("3 Cash out"));
    await userEvent.click(button("Table"));
    expect(heading()).toHaveTextContent("At the table");
    await userEvent.click(button("4 Settle"));
    await userEvent.click(button("Cash out"));
    expect(heading()).toHaveTextContent("Cash out");
  });
});
