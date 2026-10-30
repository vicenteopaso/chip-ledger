import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReadOnlyContext } from "@/app/components/ReadOnly";
import { SettleScreen } from "@/app/components/SettleScreen";
import { SetupScreen } from "@/app/components/SetupScreen";
import { TableScreen } from "@/app/components/TableScreen";
import { gameReducer } from "@/lib/game-reducer";
import { settle } from "@/lib/settlement";
import { defaultGame, gameWith, usd } from "@/test/unit/fixtures";

const sold = () =>
  gameReducer(defaultGame(), { type: "sellChips", sellerId: "p1", buyerId: "p2", amount: 5 });

describe("SPEC-0004: the table shows money in", () => {
  it("AC-0004-01, REQ-0004-01: amount first, buy-ins as a smaller line", () => {
    render(<TableScreen game={defaultGame()} money={usd} dispatch={vi.fn()} />);
    expect(screen.getAllByText("$20.00 in")).toHaveLength(4);
    expect(screen.getAllByText("1 buy-in")).toHaveLength(4);
  });

  it("REQ-0004-07: shows the net sale amount in text on each player it concerns, not a list", () => {
    render(<TableScreen game={sold()} money={usd} dispatch={vi.fn()} />);
    expect(screen.getByText("$15.00 in")).toBeInTheDocument();
    expect(screen.getByText("$25.00 in")).toBeInTheDocument();
    expect(screen.getByText(/incl\. −\$5\.00 from chip sales/)).toBeInTheDocument();
    expect(screen.getByText(/incl\. \+\$5\.00 from chip sales/)).toBeInTheDocument();
    expect(screen.getByText("$80.00")).toBeInTheDocument();
  });

  it("shows a negative money in for a seller who sold more than they bought in", () => {
    const game = gameReducer(defaultGame(), {
      type: "sellChips",
      sellerId: "p1",
      buyerId: "p2",
      amount: 50,
    });
    render(<TableScreen game={game} money={usd} dispatch={vi.fn()} />);
    expect(screen.getByText("-$30.00 in")).toBeInTheDocument();
  });

  it("REQ-0004-09: a watcher sees the amounts but no Sell chips button", () => {
    render(
      <ReadOnlyContext value>
        <TableScreen game={sold()} money={usd} dispatch={vi.fn()} />
      </ReadOnlyContext>,
    );
    expect(screen.getByText("$25.00 in")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sell chips" })).toBeNull();
  });
});

describe("SPEC-0004: the Sell chips form", () => {
  it("REQ-0004-03, -11: records a sale, then returns focus to the button", async () => {
    const dispatch = vi.fn();
    const user = userEvent.setup();
    render(<TableScreen game={defaultGame()} money={usd} dispatch={dispatch} />);
    await user.click(screen.getByRole("button", { name: "Sell chips" }));
    expect(screen.getByRole("combobox", { name: "Seller" })).toHaveFocus();
    await user.selectOptions(screen.getByRole("combobox", { name: "Seller" }), "p2");
    await user.selectOptions(screen.getByRole("combobox", { name: "Buyer" }), "p3");
    await user.type(screen.getByRole("textbox", { name: /^Amount in/ }), "5.5");
    await user.click(screen.getByRole("button", { name: "Record sale" }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "sellChips",
      sellerId: "p2",
      buyerId: "p3",
      amount: 5.5,
    });
    expect(screen.getByRole("button", { name: "Sell chips" })).toHaveFocus();
  });

  it("says the amount is money, in the game's currency, and takes no letters", async () => {
    const user = userEvent.setup();
    render(<TableScreen game={defaultGame()} money={usd} dispatch={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Sell chips" }));
    const amount = screen.getByRole("textbox", { name: "Amount in USD" });
    await user.type(amount, "a5sd.5x");
    expect(amount).toHaveValue("5.5");
  });

  it("explains in text, and records nothing, when the amount is empty or the players are the same", async () => {
    const dispatch = vi.fn();
    const user = userEvent.setup();
    render(<TableScreen game={defaultGame()} money={usd} dispatch={dispatch} />);
    await user.click(screen.getByRole("button", { name: "Sell chips" }));
    await user.click(screen.getByRole("button", { name: "Record sale" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an amount greater than zero.");
    expect(screen.getByRole("textbox", { name: /^Amount in/ })).toHaveFocus();
    await user.type(screen.getByRole("textbox", { name: /^Amount in/ }), "5");
    expect(screen.queryByRole("alert")).toBeNull();
    await user.selectOptions(screen.getByRole("combobox", { name: "Buyer" }), "p1");
    await user.click(screen.getByRole("button", { name: "Record sale" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose two different players.");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("Cancel and Esc close the form without recording anything", async () => {
    const dispatch = vi.fn();
    const user = userEvent.setup();
    render(<TableScreen game={defaultGame()} money={usd} dispatch={dispatch} />);
    await user.click(screen.getByRole("button", { name: "Sell chips" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Sell chips" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Sell chips" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Sell chips" })).toBeInTheDocument();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("SPEC-0004: Settle and Setup", () => {
  const settleView = (game: ReturnType<typeof defaultGame>) => (
    <SettleScreen
      game={game}
      settlement={settle(game)}
      money={usd}
      copy={{ kind: "idle" }}
      resetConfirming={false}
      onScaleChange={vi.fn()}
      onSpreadByChange={vi.fn()}
      onCopy={vi.fn()}
      onBackToSetup={vi.fn()}
      onResetConfirmingChange={vi.fn()}
      onReset={vi.fn()}
    />
  );

  it("REQ-0004-05: Settle says when chip sales are included, and only then", () => {
    const { unmount } = render(settleView(defaultGame()));
    expect(screen.queryByText("Includes chip sales between players.")).toBeNull();
    unmount();
    render(settleView(sold()));
    expect(screen.getByText("Includes chip sales between players.")).toBeInTheDocument();
  });

  it("REQ-0004-13: Setup says why fewer players is not available (AC-0004-10)", () => {
    const game = gameWith({
      ...gameReducer(defaultGame(), {
        type: "sellChips",
        sellerId: "p1",
        buyerId: "p4",
        amount: 5,
      }),
    });
    render(
      <SetupScreen
        game={game}
        money={usd}
        photoCountingEnabled={false}
        dispatch={vi.fn()}
        onAddChip={vi.fn()}
        onAutoFill={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Fewer players isn't available while Player 4 has money/),
    ).toBeInTheDocument();
  });

  it("does not show that message when nothing blocks it", () => {
    render(
      <SetupScreen
        game={defaultGame()}
        money={usd}
        photoCountingEnabled={false}
        dispatch={vi.fn()}
        onAddChip={vi.fn()}
        onAutoFill={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Fewer players isn't available/)).toBeNull();
  });
});
