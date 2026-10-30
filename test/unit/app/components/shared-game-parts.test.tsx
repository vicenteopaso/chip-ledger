import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectionStatus } from "@/app/components/ConnectionStatus";
import { GameUnavailable } from "@/app/components/GameUnavailable";
import { WaitingForHost } from "@/app/components/WaitingForHost";
import { WatchNotice } from "@/app/components/WatchNotice";

describe("shared-game parts", () => {
  it("REQ-0003-13: the status says how things are in words", () => {
    const { rerender } = render(<ConnectionStatus status="live" online={3} />);
    expect(screen.getByText("Live · 3 here")).toBeInTheDocument();
    rerender(<ConnectionStatus status="reconnecting" online={3} />);
    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
    rerender(<ConnectionStatus status="offline" online={null} />);
    expect(screen.getByText(/^Offline/)).toBeInTheDocument();
  });

  it("REQ-0003-06, -29: the notice states the role in text", () => {
    const { rerender } = render(<WatchNotice access="watch" archived={false} />);
    expect(screen.getByText(/^Watch only/)).toBeInTheDocument();
    rerender(<WatchNotice access="edit" archived={false} />);
    expect(screen.getByText(/edit access.*isn't available yet/i)).toBeInTheDocument();
    rerender(<WatchNotice access="edit" archived />);
    expect(screen.getByText(/archived/i)).toBeInTheDocument();
  });

  it("REQ-0003-26: the unavailable page names no cause and offers a way on", () => {
    render(<GameUnavailable />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This game isn’t available",
    );
    expect(screen.getByRole("link", { name: "Start a new game" })).toHaveAttribute("href", "/");
  });

  it("REQ-0003-15: the waiting page says the game has not started", () => {
    render(<WaitingForHost />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Waiting for the host");
    expect(screen.getByText(/hasn’t started yet/)).toBeInTheDocument();
  });
});
