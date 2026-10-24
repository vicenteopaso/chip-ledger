import { render, screen } from "@testing-library/react";
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
    />,
  );
  return { dispatch, onAddChip };
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
    />
  );
}

describe("SetupScreen", () => {
  it("REQ-0001-03: picks the player count and names players", async () => {
    const { dispatch } = renderSetup();
    expect(screen.getByRole("button", { name: "4" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "6" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setPlayerCount", count: 6 });
    expect(screen.getAllByRole("textbox", { name: /Name of player/ })).toHaveLength(4);
    await userEvent.type(screen.getByLabelText("Name of player 2"), "B");
    expect(dispatch).toHaveBeenCalledWith({ type: "setName", playerId: "p2", name: "B" });
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "The stack adds up to $20.00 but the buy-in is $2.50.",
    );
    await userEvent.selectOptions(screen.getByLabelText("Currency"), "EUR");
    expect(dispatch).toHaveBeenCalledWith({ type: "setCurrency", currency: "EUR" });
  });

  it("REQ-0001-05: edits chip rows and adds a color", async () => {
    const { dispatch, onAddChip } = renderSetup();
    expect(screen.getByText("20 chips worth $5.00")).toBeInTheDocument();
    await userEvent.selectOptions(
      screen.getAllByLabelText("Chip color")[0] as HTMLElement,
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
    expect(screen.getByRole("status")).toHaveTextContent(
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
  it("AC-0001-14: the checkbox shares one value across every row", async () => {
    const dispatch = vi.fn();
    render(<StatefulSetup onAction={dispatch} />);
    expect(screen.queryByLabelText("Value of every chip")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("checkbox", { name: "Use one value for all chips" }));
    expect(dispatch).toHaveBeenCalledWith({ type: "setUniformValue", enabled: true });
    expect(screen.queryByLabelText("Red chip value")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("The stack adds up to $10.00 but the buy-in is $20.00.");

    const shared = screen.getByLabelText("Value of every chip");
    expect(shared).toHaveValue("0.25");
    await userEvent.clear(shared);
    await userEvent.type(shared, "0.5");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "setAllChipValues", value: 0.5 });
    expect(screen.getByText("20 chips worth $10.00")).toBeInTheDocument();
    expect(screen.getAllByText("10 chips worth $5.00")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Each starting stack is worth $20.00, matching the buy-in.");

    await userEvent.click(screen.getByRole("checkbox", { name: "Use one value for all chips" }));
    expect(screen.getByLabelText("Red chip value")).toHaveValue("0.5");
  });
});
