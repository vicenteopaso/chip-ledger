import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/app/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("REQ-0001-32: names the current choice and asks for the next one", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ThemeToggle theme="system" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Theme: System" }));
    expect(onChange).toHaveBeenLastCalledWith("light");
    rerender(<ThemeToggle theme="light" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Theme: Light" }));
    expect(onChange).toHaveBeenLastCalledWith("dark");
    rerender(<ThemeToggle theme="dark" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Theme: Dark" }));
    expect(onChange).toHaveBeenLastCalledWith("system");
  });
});
