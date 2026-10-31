import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppHeader } from "@/app/components/AppHeader";

const scrollTo = (y: number) => {
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });
};

const header = () =>
  render(
    <AppHeader action={<button type="button">Share</button>}>
      <nav aria-label="Steps" />
    </AppHeader>,
  );

describe("AppHeader (a sticky header that shrinks)", () => {
  afterEach(() => {
    scrollTo(0);
  });

  it("is one banner with the brand, the action and the steps", () => {
    header();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Chip Ledger")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Steps" })).toBeInTheDocument();
  });

  it("stays at the top of the screen", () => {
    header();
    expect(screen.getByRole("banner")).toHaveClass("sticky", "top-0");
  });

  it("shrinks once the page is scrolled, keeps the brand and the steps, and drops the action", () => {
    header();
    const banner = screen.getByRole("banner");
    expect(banner).toHaveAttribute("data-compact", "false");
    scrollTo(120);
    expect(banner).toHaveAttribute("data-compact", "true");
    expect(screen.getByText("Chip Ledger")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Steps" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  });

  it("grows back, and brings the action back, only near the top", () => {
    header();
    scrollTo(120);
    // A little scroll back is not enough, so it cannot flicker at the edge.
    scrollTo(30);
    expect(screen.getByRole("banner")).toHaveAttribute("data-compact", "true");
    scrollTo(0);
    expect(screen.getByRole("banner")).toHaveAttribute("data-compact", "false");
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("does not shrink for a small scroll", () => {
    header();
    scrollTo(30);
    expect(screen.getByRole("banner")).toHaveAttribute("data-compact", "false");
  });
});
