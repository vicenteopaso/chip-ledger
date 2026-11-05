import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SettleScreen } from "@/app/components/SettleScreen";
import { TableScreen } from "@/app/components/TableScreen";
import type { GameState } from "@/lib/game";
import { settle } from "@/lib/settlement";
import { defaultGame, usd } from "@/test/unit/fixtures";

const noop = vi.fn();

/** Four named players at $20 each, with these blue ($1) chip counts at cash out. */
function named(blue: number[], overrides: Partial<GameState> = {}): GameState {
  const game = defaultGame();
  return {
    ...game,
    screen: "settle",
    players: game.players.map((p, i) => ({
      ...p,
      name: ["Ana", "Ben", "Cy", "Dee"][i] ?? "",
      counts: { blue: blue[i] ?? 0 },
    })),
    ...overrides,
  };
}

function renderSettle(game: GameState) {
  return render(
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
  );
}

describe("Table (SPEC-0005)", () => {
  it("AC-0005-03, REQ-0005-05: the pot comes first, on the felt, before the players", () => {
    const { container } = render(
      <TableScreen game={{ ...named([]), screen: "table" }} money={usd} dispatch={noop} />,
    );
    const pot = screen.getByText("Money in the pot").closest("section");
    expect(pot).toHaveClass("bg-felt");
    expect(pot).toHaveTextContent("Money in the pot$80.004 buy-ins so far.");
    expect(pot).not.toHaveAttribute("aria-live");
    const firstPlayer = screen.getByText("Ana");
    // The pot is before the first player in document order.
    expect(
      (pot?.compareDocumentPosition(firstPlayer) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.querySelectorAll(".bg-felt")).toHaveLength(1);
  });

  it("AC-0005-04, REQ-0005-06: each player has a decorative initial", () => {
    const game = named([]);
    const players = game.players.map((p, i) => (i === 1 ? { ...p, name: "alex" } : p));
    render(
      <TableScreen game={{ ...game, players, screen: "table" }} money={usd} dispatch={noop} />,
    );
    const ana = screen.getByText("Ana").closest("div")?.parentElement;
    const alex = screen.getByText("alex").closest("div")?.parentElement;
    for (const row of [ana, alex]) {
      const avatar = row?.querySelector('[aria-hidden="true"]');
      expect(avatar).toHaveTextContent(/^A$/);
    }
  });
});

describe("Settle (SPEC-0005)", () => {
  it("AC-0005-05, REQ-0005-07: results are ranked, biggest winner first", () => {
    renderSettle(named([10, 20, 40, 10]));
    const results = screen.getAllByRole("list").at(-1);
    const names = within(results as HTMLElement)
      .getAllByRole("listitem")
      .map((item) => item.querySelector("b")?.textContent);
    expect(names).toEqual(["Cy", "Ben", "Ana", "Dee"]);
  });

  it("AC-0005-06, REQ-0005-08: each net has a bar from the middle, as long as against the largest", () => {
    const { container } = renderSettle(named([10, 20, 40, 10]));
    const bars = [...container.querySelectorAll(".net-bar")];
    expect(bars).toHaveLength(4);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden", "true");
    const [cy, ben, ana] = bars.map((bar) => bar.querySelector("[data-net]"));
    expect(cy).toHaveAttribute("data-net", "gain");
    expect(cy).toHaveAttribute("x", "100");
    expect(cy).toHaveAttribute("width", "100");
    expect(cy).toHaveClass("fill-success");
    // Break-even: no bar.
    expect(ben).toBeNull();
    // A loss half as big as the largest net points left, half as long.
    expect(ana).toHaveAttribute("data-net", "loss");
    expect(ana).toHaveAttribute("x", "50");
    expect(ana).toHaveAttribute("width", "50");
    expect(ana).toHaveClass("fill-danger");
  });

  it("AC-0005-07, REQ-0005-09: says the money balances, and only when it does", () => {
    const { unmount } = renderSettle(named([10, 20, 40, 10]));
    expect(screen.getByText("$80.00 in, $80.00 out. Balanced.")).toBeInTheDocument();
    unmount();
    renderSettle(named([10, 20, 40, 0], { scale: false }));
    expect(screen.queryByText(/Balanced\./)).toBeNull();
    expect(screen.getByText(/short of the \$80\.00 pot/)).toBeInTheDocument();
  });

  it("AC-0005-07, REQ-0005-09: a shared difference balances the payments", () => {
    renderSettle(named([10, 20, 40, 0], { scale: true, spreadBy: "equal" }));
    expect(screen.getByText("$80.00 in, $80.00 out. Balanced.")).toBeInTheDocument();
  });

  it("AC-0005-08, REQ-0005-10: short amounts on screen, full words for assistive technology", () => {
    renderSettle(named([10, 20, 40, 10]));
    const cy = screen.getByText("In 20.00 · Out 40.00");
    expect(cy).toHaveAttribute("aria-hidden", "true");
    expect(cy.nextElementSibling).toHaveClass("sr-only");
    expect(cy.nextElementSibling).toHaveTextContent("Put in $20.00, cashed out $40.00");
  });

  it("AC-0005-04, REQ-0005-06: each payment shows both players' initials, hidden from assistive technology", () => {
    renderSettle(named([10, 20, 40, 10]));
    const payment = screen.getAllByRole("listitem")[0];
    const initials = payment?.querySelector('span[aria-hidden="true"]');
    expect(initials).toHaveTextContent(/^AC$|^DC$/);
  });
});
