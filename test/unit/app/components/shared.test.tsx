import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buttonClasses } from "@/app/components/Button";
import { FIELD } from "@/app/components/Field";
import { Notice } from "@/app/components/Notice";
import { Select } from "@/app/components/Select";
import { Stepper } from "@/app/components/Stepper";
import { Card, ListRow } from "@/app/components/Surfaces";
import { TableScreen } from "@/app/components/TableScreen";
import { SetupScreen } from "@/app/components/SetupScreen";
import { defaultGame, usd } from "@/test/unit/fixtures";

describe("Stepper", () => {
  it("AC-0002-19: steps both ways and marks its limits without losing focus", async () => {
    const onStep = vi.fn();
    const { rerender } = render(
      <Stepper
        label="Buy-ins for Ana"
        value={1}
        min={0}
        max={2}
        decrementLabel="Remove a buy-in for Ana"
        incrementLabel="Add a buy-in for Ana"
        onStep={onStep}
      />,
    );
    const group = screen.getByRole("group", { name: "Buy-ins for Ana" });
    expect(within(group).getByRole("status", { name: "Buy-ins for Ana" })).toHaveTextContent("1");
    await userEvent.click(screen.getByRole("button", { name: "Add a buy-in for Ana" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove a buy-in for Ana" }));
    expect(onStep.mock.calls).toEqual([[1], [-1]]);

    rerender(
      <Stepper
        label="Buy-ins for Ana"
        value={0}
        min={0}
        max={2}
        decrementLabel="Remove a buy-in for Ana"
        incrementLabel="Add a buy-in for Ana"
        onStep={onStep}
      />,
    );
    const remove = screen.getByRole("button", { name: "Remove a buy-in for Ana" });
    expect(remove).toHaveAttribute("aria-disabled", "true");
    expect(remove).toBeEnabled();
  });

  it("AC-0002-19: Setup's player count and Table's buy-ins render the same stepper", () => {
    const game = defaultGame();
    const { container: setup } = render(
      <SetupScreen
        game={game}
        money={usd}
        photoCountingEnabled={false}
        dispatch={vi.fn()}
        onAddChip={vi.fn()}
        onAutoFill={vi.fn()}
      />,
    );
    const setupButton = within(setup).getByRole("button", { name: "More players" }).className;
    const { container: table } = render(
      <TableScreen game={{ ...game, screen: "table" }} money={usd} dispatch={vi.fn()} />,
    );
    const tableButton = within(table).getByRole("button", {
      name: "Add a buy-in for Player 1",
    }).className;
    expect(setupButton).toBe(tableButton);
  });
});

describe("surfaces, notices, and the outline button", () => {
  it("AC-0002-19: Card and ListRow share one look and take layout classes", () => {
    render(
      <ul>
        <Card as="li" className="flex">
          card
        </Card>
        <ListRow as="li" className="grid">
          row
        </ListRow>
      </ul>,
    );
    expect(screen.getByText("card")).toHaveClass("rounded-xl", "border", "bg-surface", "flex");
    expect(screen.getByText("row")).toHaveClass("border-b", "py-3", "grid");
  });

  it("AC-0002-19, REQ-0002-31: every notice kind is the same tinted panel with an icon", () => {
    const { container } = render(
      <>
        <Notice notice={{ kind: "ok", text: "All good." }} />
        <Notice notice={{ kind: "warn", text: "Check this." }}>
          <span>extra</span>
        </Notice>
      </>,
    );
    const boxes = container.querySelectorAll(":scope > div");
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      // A left rule on a tint, never a full border: notices don't look like fields or buttons.
      expect(box).toHaveClass("flex", "border-l-4", "border-0");
      expect(box.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
    expect(screen.getByText("extra")).toBeInTheDocument();
  });

  it("AC-0002-19: the outline variant is a shared button style", () => {
    expect(buttonClasses("outline")).toContain("border-accent");
    expect(buttonClasses("outline")).toContain("press");
  });
});

describe("control language", () => {
  it("AC-0002-31: buttons are pills, fields are squared boxes, so they never look alike", () => {
    for (const variant of ["primary", "secondary", "danger", "outline"] as const) {
      expect(buttonClasses(variant)).toContain("rounded-full");
      expect(buttonClasses(variant)).not.toContain("border-border-control");
    }
    expect(buttonClasses("secondary")).toContain("bg-accent-soft");
    expect(buttonClasses("danger")).toContain("bg-danger-soft");
    expect(FIELD).toContain("rounded-md");
    expect(FIELD).toContain("border-border-control");
    expect(FIELD).not.toContain("rounded-full");
  });

  it("AC-0002-31: the stepper is a field-styled box with round keys", () => {
    render(
      <Stepper
        label="Players"
        value={4}
        min={2}
        decrementLabel="Fewer"
        incrementLabel="More"
        onStep={vi.fn()}
      />,
    );
    const group = screen.getByRole("group", { name: "Players" });
    expect(group).toHaveClass("h-12", "rounded-md", "border-border-control", "bg-surface");
    expect(screen.getByRole("button", { name: "Fewer" })).toHaveClass(
      "rounded-full",
      "bg-accent-soft",
    );
  });

  it("AC-0002-32: a select draws its chevron inside the box and stays a named list box", async () => {
    const onChange = vi.fn();
    render(
      <>
        <label htmlFor="cur">Currency</label>
        <Select id="cur" className="pl-3" value="EUR" onChange={onChange}>
          <option>EUR</option>
          <option>USD</option>
        </Select>
      </>,
    );
    const select = screen.getByRole("combobox", { name: "Currency" });
    expect(select).toHaveClass("appearance-none", "pr-8", "pl-3", "w-full");
    const chevron = select.parentElement?.querySelector("svg");
    expect(chevron).toHaveAttribute("aria-hidden", "true");
    expect(chevron).toHaveClass("pointer-events-none", "absolute", "right-2.5");
    await userEvent.selectOptions(select, "USD");
    expect(onChange).toHaveBeenCalled();
  });
});
