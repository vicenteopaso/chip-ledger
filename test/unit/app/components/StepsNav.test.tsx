import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StepsNav } from "@/app/components/StepsNav";

describe("StepsNav", () => {
  it("REQ-0001-01: marks the current step and opens any step", async () => {
    const onSelect = vi.fn();
    render(<StepsNav current="cashout" onSelect={onSelect} />);
    expect(screen.getByRole("navigation", { name: "Steps" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 Cash out" })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("button", { name: "1 Setup (done)" })).not.toHaveAttribute(
      "aria-current",
    );
    await userEvent.click(screen.getByRole("button", { name: "4 Settle" }));
    expect(onSelect).toHaveBeenCalledWith("settle");
  });

  it("AC-0002-04, REQ-0005-13: marks earlier steps done in text, not only by color", () => {
    render(<StepsNav current="cashout" onSelect={vi.fn()} />);
    for (const name of ["1 Setup (done)", "2 Table (done)"]) {
      const step = screen.getByRole("button", { name });
      // The visible text is the name alone, with a check mark beside it.
      expect(step).toHaveTextContent(/^Setup$|^Table$/);
      expect(step.querySelector(".step-label svg")).not.toBeNull();
    }
    // The number is in the name, not on screen.
    expect(screen.getByRole("button", { name: "3 Cash out" })).toHaveTextContent(/^Cash out$/);
    expect(screen.getByRole("button", { name: "4 Settle" })).not.toHaveTextContent("done");
    expect(screen.getByRole("button", { name: "4 Settle" }).querySelector("svg")).toBeNull();
  });

  it("AC-0005-11, REQ-0005-13: is an ordered list of bars that fill up to the current step", () => {
    const { container } = render(<StepsNav current="table" onSelect={vi.fn()} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(
      within(screen.getByRole("list"))
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(["1 Setup (done)", "2 Table", "3 Cash out", "4 Settle"]);
    const bars = [...container.querySelectorAll(".step-bar")];
    expect(bars.map((bar) => bar.getAttribute("data-state"))).toEqual([
      "done",
      "current",
      "upcoming",
      "upcoming",
    ]);
    // Brass up to the current step, which is thicker; the control border after it.
    expect(bars[0]).toHaveClass("bg-accent", "h-0.75");
    expect(bars[1]).toHaveClass("bg-accent", "h-1");
    expect(bars[2]).toHaveClass("bg-border-control");
    for (const bar of bars) expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "2 Table" })).toHaveClass("font-semibold");
  });
});
