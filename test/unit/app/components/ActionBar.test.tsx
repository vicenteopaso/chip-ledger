import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActionBar } from "@/app/components/ActionBar";

const scrollTo = (y: number) => {
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });
};

describe("ActionBar", () => {
  afterEach(() => {
    scrollTo(0);
  });

  it("REQ-0002-10: shows its buttons and footer in the bar", () => {
    render(<ActionBar footer={<p>Footer</p>}>{<button type="button">Go</button>}</ActionBar>);
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("REQ-0002-10: shrinks once the page is scrolled and grows back at the top", () => {
    const { container } = render(
      <ActionBar footer={<p>Footer</p>}>{<button type="button">Go</button>}</ActionBar>,
    );
    const bar = container.firstElementChild;
    expect(bar).toHaveAttribute("data-compact", "false");
    scrollTo(120);
    expect(bar).toHaveAttribute("data-compact", "true");
    scrollTo(0);
    expect(bar).toHaveAttribute("data-compact", "false");
  });

  it("REQ-0002-10: stops listening for scrolls when it unmounts", () => {
    const { unmount } = render(<ActionBar>{<button type="button">Go</button>}</ActionBar>);
    unmount();
    expect(() => {
      scrollTo(120);
    }).not.toThrow();
  });
});
