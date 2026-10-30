import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DraftInput } from "@/app/components/DraftInput";

const text = (value: string) => (
  <DraftInput
    aria-label="Name"
    value={value}
    format={(v) => v}
    parse={(t) => t}
    onValueChange={vi.fn()}
  />
);

describe("DraftInput and a change from elsewhere (REQ-0003-12)", () => {
  it("follows a new value while nobody is typing in it", () => {
    const { rerender } = render(text("Ana"));
    rerender(text("Ben"));
    expect(screen.getByLabelText("Name")).toHaveValue("Ben");
  });

  it("keeps what the person is typing while a new value arrives, and takes it in on leaving", async () => {
    const user = userEvent.setup();
    const { rerender } = render(text("Ana"));
    const field = screen.getByLabelText("Name");
    await user.click(field);
    await user.type(field, "x");
    expect(field).toHaveValue("Anax");
    rerender(text("Ben"));
    expect(field).toHaveValue("Anax");
    expect(field).toHaveFocus();
    await user.tab();
    expect(field).toHaveValue("Ben");
  });

  it("leaves the text alone on leaving when it already matches", async () => {
    const user = userEvent.setup();
    const { rerender } = render(text("Ana"));
    const field = screen.getByLabelText("Name");
    await user.click(field);
    rerender(text("Ana"));
    await user.tab();
    expect(field).toHaveValue("Ana");
  });

  it("passes focus and blur on to the caller", async () => {
    const user = userEvent.setup();
    const onFocus = vi.fn();
    const onBlur = vi.fn();
    render(
      <DraftInput
        aria-label="Name"
        value="Ana"
        format={(v) => v}
        parse={(t) => t}
        onValueChange={vi.fn()}
        onFocus={onFocus}
        onBlur={onBlur}
      />,
    );
    await user.click(screen.getByLabelText("Name"));
    await user.tab();
    expect(onFocus).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
  });
});
