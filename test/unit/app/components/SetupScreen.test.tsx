import { render, screen, within } from "@testing-library/react";
import { useReducer } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SetupScreen } from "@/app/components/SetupScreen";
import { CHIP_COLORS } from "@/lib/chips";
import { type GameAction, gameReducer } from "@/lib/game-reducer";
import { defaultGame, gameWith, usd } from "@/test/unit/fixtures";

function renderSetup(game = defaultGame(), photoCountingEnabled = false) {
  const dispatch = vi.fn();
  const onAddChip = vi.fn();
  render(
    <SetupScreen
      game={game}
      money={usd}
      photoCountingEnabled={photoCountingEnabled}
      dispatch={dispatch}
      onAddChip={onAddChip}
      onAutoFill={vi.fn()}
    />,
  );
  return { dispatch, onAddChip };
}

/** The Setup summary, which also describes the buy-in field and "Start the game". */
function summary(): HTMLElement {
  const element = document.getElementById("setup-summary");
  if (!element) throw new Error("No Setup summary");
  return element;
}

/** Real reducer behind the screen, so props follow dispatches as they do in the app. */
function StatefulSetup({ onAction }: { onAction: (action: GameAction) => void }) {
  const [game, dispatch] = useReducer(gameReducer, undefined, defaultGame);
  return (
    <SetupScreen
      game={game}
      money={usd}
      photoCountingEnabled={false}
      dispatch={(action) => {
        onAction(action);
        dispatch(action);
      }}
      onAddChip={vi.fn()}
      onAutoFill={() => {
        dispatch({ type: "autoFillChips", chipIds: ["a", "b", "c"] });
      }}
    />
  );
}

describe("SetupScreen", () => {
  it("REQ-0001-03: steps the player count with − and + and names players", async () => {
    const { dispatch } = renderSetup();
    expect(screen.getByRole("group", { name: "Number of players" })).toHaveTextContent("4");
    await userEvent.click(screen.getByRole("button", { name: "More players" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setPlayerCount", count: 5 });
    await userEvent.click(screen.getByRole("button", { name: "Fewer players" }));
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setPlayerCount", count: 3 });
    expect(screen.getAllByRole("textbox", { name: /^Player \d+ name$/ })).toHaveLength(4);
    await userEvent.type(screen.getByLabelText("Player 2 name"), "B");
    expect(dispatch).toHaveBeenCalledWith({ type: "setName", playerId: "p2", name: "B" });
  });

  it("AC-0001-17: stops at 2 and 10 players and shows a name field for each", async () => {
    render(<StatefulSetup onAction={vi.fn()} />);
    const more = screen.getByRole("button", { name: "More players" });
    const fewer = screen.getByRole("button", { name: "Fewer players" });
    for (let i = 0; i < 6; i += 1) await userEvent.click(more);
    expect(screen.getByRole("group", { name: "Number of players" })).toHaveTextContent("10");
    // REQ-0002-13: unavailable at the limit, but still focusable.
    expect(more).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("textbox", { name: /^Player \d+ name$/ })).toHaveLength(10);
    for (let i = 0; i < 8; i += 1) await userEvent.click(fewer);
    expect(screen.getByRole("group", { name: "Number of players" })).toHaveTextContent("2");
    expect(fewer).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByRole("textbox", { name: /^Player \d+ name$/ })).toHaveLength(2);
  });

  it("REQ-0001-04: keeps in-progress decimal text while sending the parsed buy-in", async () => {
    const dispatch = vi.fn();
    render(<StatefulSetup onAction={dispatch} />);
    const buyIn = screen.getByLabelText("Buy-in amount");
    await userEvent.clear(buyIn);
    await userEvent.type(buyIn, "2,");
    expect(buyIn).toHaveValue("2,");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setBuyIn", buyIn: 2 });
    await userEvent.type(buyIn, "5");
    expect(buyIn).toHaveValue("2,5");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setBuyIn", buyIn: 2.5 });
    // The chips are balanced automatically, so the stack follows the buy-in (REQ-0001-29).
    expect(summary()).toHaveTextContent("Each starting stack is worth $2.50, matching the buy-in.");
    await userEvent.selectOptions(screen.getByLabelText("Currency"), "EUR");
    expect(dispatch).toHaveBeenCalledWith({ type: "setCurrency", currency: "EUR" });
  });

  it("REQ-0001-05: edits chip rows and adds a color", async () => {
    const { dispatch, onAddChip } = renderSetup();
    expect(screen.getByText("20 chips worth $5.00")).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getAllByLabelText(/chip color$/)[0] as HTMLElement,
      "black",
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: "setChipColor",
      chipId: "white",
      color: "black",
    });
    await userEvent.type(screen.getByLabelText("Red chips per player"), "5");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setChipCount", chipId: "red", count: 105 });
    await userEvent.type(screen.getByLabelText("Blue chip value"), "0");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setChipValue", chipId: "blue", value: 10 });
    await userEvent.click(screen.getByRole("button", { name: "Remove Red" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "removeChip", chipId: "red" });
    await userEvent.click(screen.getByRole("button", { name: "Add a chip color" }));
    expect(onAddChip).toHaveBeenCalledOnce();
  });

  it("REQ-0001-05: disables removing the last row", () => {
    renderSetup(gameWith({ chips: [{ id: "red", color: "red", count: 1, value: 1 }] }));
    expect(screen.getByRole("button", { name: "Remove Red" })).toBeDisabled();
  });

  it("REQ-0001-05: hides Add when every color is used", () => {
    const all = CHIP_COLORS.map((color) => ({ id: color, color, count: 1, value: 1 }));
    renderSetup(gameWith({ chips: all }));
    expect(screen.queryByRole("button", { name: "Add a chip color" })).not.toBeInTheDocument();
  });

  it("REQ-0001-06, -13: shows the stack summary and the intro without photo wording when off", () => {
    renderSetup();
    expect(summary()).toHaveTextContent(
      "Each starting stack is worth $20.00, matching the buy-in.",
    );
    expect(screen.getByText(/count chips at the end/)).toBeInTheDocument();
  });

  it("REQ-0001-13: uses the prototype's photo wording when photo counting is on", () => {
    renderSetup(defaultGame(), true);
    expect(screen.getByText(/count chips from a photo at the end/)).toBeInTheDocument();
  });
});

describe("SetupScreen: one value for all chips", () => {
  it("AC-0001-14: switches between the color rows and one All colors row", async () => {
    const dispatch = vi.fn();
    render(<StatefulSetup onAction={dispatch} />);
    const toggle = screen.getByRole("checkbox", { name: "Use one value for all chips" });

    await userEvent.click(toggle);
    expect(dispatch).toHaveBeenCalledWith({ type: "setUniformValue", enabled: true });
    expect(screen.queryByLabelText("Red chip value")).not.toBeInTheDocument();
    expect(screen.queryAllByLabelText(/chip color$/)).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Add a chip color" })).not.toBeInTheDocument();
    expect(screen.getByText("All colors")).toBeInTheDocument();
    expect(screen.getByLabelText("Chips per player")).toHaveValue("40");
    expect(screen.getByLabelText("Value of every chip")).toHaveValue("0.5");
    expect(screen.getByRole("button", { name: "Remove All colors" })).toBeDisabled();
    expect(screen.getByText("40 chips worth $20.00")).toBeInTheDocument();
    expect(summary()).toHaveTextContent(
      "Each starting stack is worth $20.00, matching the buy-in.",
    );

    const value = screen.getByLabelText("Value of every chip");
    await userEvent.clear(value);
    await userEvent.type(value, "1");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setUniformChipValue", value: 1 });
    await userEvent.type(screen.getByLabelText("Chips per player"), "0");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setUniformChipCount", count: 400 });
    expect(summary()).toHaveTextContent("The stack adds up to $400.00");

    await userEvent.click(toggle);
    expect(screen.queryByText("All colors")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Red chip value")).toHaveValue("0.5");
    expect(screen.getByRole("button", { name: "Add a chip color" })).toBeInTheDocument();
  });
});

describe("SetupScreen: balanced chips and currencies", () => {
  it("AC-0001-15: editing a chip stops the balancing and offers to fill it again", async () => {
    const dispatch = vi.fn();
    render(<StatefulSetup onAction={dispatch} />);
    expect(screen.getByText(/The chips adjust to the buy-in/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fill the chips to match the buy-in" }),
    ).not.toBeInTheDocument();

    const buyIn = screen.getByLabelText("Buy-in amount");
    await userEvent.clear(buyIn);
    await userEvent.type(buyIn, "40");
    expect(screen.getByLabelText("White chip value")).toHaveValue("0.5");
    expect(screen.getByLabelText("Blue chip value")).toHaveValue("2");

    await userEvent.type(screen.getByLabelText("White chips per player"), "1");
    expect(
      screen.getByRole("button", { name: "Fill the chips to match the buy-in" }),
    ).toBeInTheDocument();
    expect(summary()).toHaveTextContent("The stack adds up to");
    await userEvent.clear(buyIn);
    await userEvent.type(buyIn, "20");
    expect(screen.getByLabelText("White chip value")).toHaveValue("0.5");

    await userEvent.click(
      screen.getByRole("button", { name: "Fill the chips to match the buy-in" }),
    );
    expect(screen.getByLabelText("White chip value")).toHaveValue("0.25");
    expect(summary()).toHaveTextContent("matching the buy-in");
    expect(screen.getByText(/The chips adjust to the buy-in/)).toBeInTheDocument();
  });

  it("AC-0001-16: lists common currencies and rescales the stack for CLP", async () => {
    render(<StatefulSetup onAction={vi.fn()} />);
    const currency = screen.getByLabelText("Currency");
    expect(within(currency).getAllByRole("option").length).toBeGreaterThanOrEqual(30);
    await userEvent.selectOptions(currency, "CLP");
    expect(screen.getByLabelText("Buy-in amount")).toHaveValue("10000");
    expect(screen.getByLabelText("White chips per player")).toHaveValue("22");
    expect(screen.getByLabelText("White chip value")).toHaveValue("100");
    expect(screen.getByLabelText("Blue chip value")).toHaveValue("400");
    expect(summary()).toHaveTextContent(/worth \$?CLP|matching the buy-in/);

    const buyIn = screen.getByLabelText("Buy-in amount");
    await userEvent.clear(buyIn);
    await userEvent.type(buyIn, "20.000");
    expect(screen.getByLabelText("White chip value")).toHaveValue("250");
    expect(screen.getByLabelText("Blue chip value")).toHaveValue("1000");
  });
});
