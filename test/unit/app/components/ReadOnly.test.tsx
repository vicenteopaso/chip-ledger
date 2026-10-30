import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CashOutScreen } from "@/app/components/CashOutScreen";
import { ReadOnlyContext } from "@/app/components/ReadOnly";
import { SettleScreen } from "@/app/components/SettleScreen";
import { SetupScreen } from "@/app/components/SetupScreen";
import { Stepper } from "@/app/components/Stepper";
import { TableScreen } from "@/app/components/TableScreen";
import { settle } from "@/lib/settlement";
import { defaultGame, gameWith, usd } from "@/test/unit/fixtures";

const watching = (children: ReactNode) => (
  <ReadOnlyContext value={true}>{children}</ReadOnlyContext>
);
const noop = vi.fn();

describe("read-only controls (REQ-0003-06)", () => {
  it("a stepper shows its number and no buttons", () => {
    const { rerender } = render(
      watching(
        <Stepper
          label="Buy-ins for Ana"
          value={2}
          min={0}
          decrementLabel="Remove"
          incrementLabel="Add"
          onStep={noop}
        />,
      ),
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("group", { name: "Buy-ins for Ana" })).toHaveTextContent("2");
    rerender(
      <Stepper
        label="Buy-ins for Ana"
        value={2}
        min={0}
        decrementLabel="Remove"
        incrementLabel="Add"
        onStep={noop}
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("Table: no buy-in buttons, but the buy-ins and the pot are there", () => {
    render(watching(<TableScreen game={defaultGame()} money={usd} dispatch={noop} />));
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Money in the pot")).toBeInTheDocument();
  });

  it("Setup: names and amounts are read-only, choices are disabled, edit buttons are gone", () => {
    const game = gameWith({ autoChips: false });
    render(
      watching(
        <SetupScreen
          game={game}
          money={usd}
          photoCountingEnabled={false}
          dispatch={noop}
          onAddChip={noop}
          onAutoFill={noop}
        />,
      ),
    );
    const name = screen.getByLabelText("Player 1 name");
    expect(name).toHaveAttribute("readonly");
    expect(name).toHaveAttribute("aria-readonly", "true");
    expect(screen.getByLabelText(/^Buy-in/)).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Currency")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: /one value for all chips/i })).toBeDisabled();
    expect(screen.getByLabelText("White chip color")).toBeDisabled();
    expect(screen.queryByRole("button", { name: /fill the chips/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add a chip color/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("Setup: the same screen outside a watch view is editable", () => {
    render(
      <SetupScreen
        game={gameWith({ autoChips: false })}
        money={usd}
        photoCountingEnabled={false}
        dispatch={noop}
        onAddChip={noop}
        onAutoFill={noop}
      />,
    );
    expect(screen.getByLabelText("Player 1 name")).not.toHaveAttribute("readonly");
    expect(screen.getByLabelText("Currency")).toBeEnabled();
    expect(screen.getByRole("button", { name: /fill the chips/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Remove/ }).length).toBeGreaterThan(0);
  });

  it("Cash out: counts are read-only fields", () => {
    render(
      watching(<CashOutScreen game={defaultGame()} money={usd} dispatch={noop} onPhoto={noop} />),
    );
    const field = screen.getAllByRole("textbox")[0];
    expect(field).toHaveAttribute("readonly");
    expect(field).toHaveAttribute("aria-readonly", "true");
  });

  it("Settle: says in words when the difference is shared equally", () => {
    const game = gameWith({ scale: true, spreadBy: "equal" });
    render(
      watching(
        <SettleScreen
          game={game}
          settlement={settle(game)}
          money={usd}
          copy={{ kind: "idle" }}
          resetConfirming={false}
          onScaleChange={noop}
          onSpreadByChange={noop}
          onCopy={noop}
          onBackToSetup={noop}
          onResetConfirmingChange={noop}
          onReset={noop}
        />,
      ),
    );
    expect(screen.getByText(/^Shared equally\./)).toBeInTheDocument();
  });

  it("Settle: the sharing choices are disabled, there is no reset, and copying still works", () => {
    const game = gameWith({ scale: true });
    render(
      watching(
        <SettleScreen
          game={game}
          settlement={settle(game)}
          money={usd}
          copy={{ kind: "idle" }}
          resetConfirming={false}
          onScaleChange={noop}
          onSpreadByChange={noop}
          onCopy={noop}
          onBackToSetup={noop}
          onResetConfirmingChange={noop}
          onReset={noop}
        />,
      ),
    );
    const notice = screen.getByText(/difference so the payments balance/i).closest("div");
    expect(within(notice ?? document.body).getByRole("checkbox")).toBeDisabled();
    // Disabled radios hide which choice is on, so the choice is said in words.
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.getByText(/^Shared in proportion to chips\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start over/i })).toBeNull();
    expect(screen.getByRole("button", { name: "Copy results" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Back to Setup" })).toBeEnabled();
  });
});

describe("Settle without a reset", () => {
  it("allowReset={false} hides Start over for someone who can otherwise edit", () => {
    const game = gameWith({ scale: true });
    render(
      <SettleScreen
        game={game}
        settlement={settle(game)}
        money={usd}
        copy={{ kind: "idle" }}
        resetConfirming={false}
        allowReset={false}
        onScaleChange={noop}
        onSpreadByChange={noop}
        onCopy={noop}
        onBackToSetup={noop}
        onResetConfirmingChange={noop}
        onReset={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: /start over/i })).toBeNull();
    expect(screen.getAllByRole("radio").length).toBeGreaterThan(0);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeEnabled();
  });
});
