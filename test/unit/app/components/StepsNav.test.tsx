import { render, screen } from "@testing-library/react";
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
      expect(screen.getByRole("button", { name })).toHaveTextContent(/^✓/);
    }
    expect(screen.getByRole("button", { name: "3 Cash out" })).not.toHaveTextContent("✓");
    expect(screen.getByRole("button", { name: "4 Settle" })).not.toHaveTextContent("done");
  });
});
