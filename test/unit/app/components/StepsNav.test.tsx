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

  it("AC-0002-04: marks earlier steps done in text, not only by color", () => {
    render(<StepsNav current="cashout" onSelect={vi.fn()} />);
    const done = ["1 Setup (done)", "2 Table (done)"];
    for (const name of done) {
      // The check mark replaces the number, so 15 px labels fit at 320 px (REQ-0002-16).
      const step = screen.getByRole("button", { name });
      expect(step).toHaveTextContent(/^Setup$|^Table$/);
      expect(step.querySelector(".step-dot svg")).not.toBeNull();
    }
    expect(screen.getByRole("button", { name: "3 Cash out" })).toHaveTextContent(/^3 Cash out$/);
    expect(screen.getByRole("button", { name: "4 Settle" })).not.toHaveTextContent("done");
  });

  it("AC-0002-27: is an ordered list of circles on a line that fills up to the current step", () => {
    const { container } = render(<StepsNav current="table" onSelect={vi.fn()} />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    const dots = [...container.querySelectorAll(".step-dot")];
    expect(dots.map((dot) => dot.textContent)).toEqual(["", "2", "3", "4"]);
    expect(dots[0]?.querySelector("svg")).not.toBeNull();
    // The current circle has a halo; later ones are outlined, not filled.
    expect(dots[1]).toHaveClass("bg-accent", "ring-4");
    expect(dots[2]).toHaveClass("bg-surface", "border-border-control");
    // One track, and a fill up to the current step (the second of four).
    const lines = [...container.querySelectorAll(".step-line")];
    expect(lines).toHaveLength(2);
    expect(container.querySelector(".step-progress")).toHaveAttribute("data-step", "1");
    expect(container.querySelector(".step-progress")).toHaveClass("bg-accent");
    for (const decoration of [dots[0], ...lines]) {
      expect(decoration).toHaveAttribute("aria-hidden", "true");
    }
  });
});
