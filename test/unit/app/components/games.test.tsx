import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type GamesSheetProps, GamesSheet } from "@/app/components/GamesSheet";
import { HeaderButton } from "@/app/components/HeaderButton";
import { WatchNotice } from "@/app/components/WatchNotice";

function props(overrides: Partial<GamesSheetProps> = {}): GamesSheetProps {
  return {
    open: true,
    onClose: vi.fn(),
    games: [
      { id: "aaaaaaaaaaaaaaaa", title: "Ana, Ben", role: "edit", current: true },
      { id: "bbbbbbbbbbbbbbbb", title: "Cy, Dee", role: "watch", current: false },
    ],
    ownGame: { title: "Eve, Fay", current: false },
    onOpenGame: vi.fn(),
    onOpenOwn: vi.fn(),
    leaving: null,
    onLeavingChange: vi.fn(),
    onLeave: vi.fn(),
    ...overrides,
  };
}

describe("GamesSheet (SPEC-0003 REQ-0003-17)", () => {
  it("is a labelled dialog that says leaving only affects this device", () => {
    render(<GamesSheet {...props()} />);
    const dialog = screen.getByRole("dialog", { name: "Games" });
    expect(within(dialog).getByText(/only takes it off this device/)).toBeInTheDocument();
  });

  it("lists this device's own game and each shared game, with what you can do and which is open", () => {
    render(<GamesSheet {...props()} />);
    expect(screen.getByText("Eve, Fay")).toBeInTheDocument();
    expect(screen.getByText("Can edit · Open now")).toBeInTheDocument();
    expect(screen.getByText("Watch only")).toBeInTheDocument();
  });

  it("opens another game, and this device's own, but not the one already open", async () => {
    const onOpenGame = vi.fn();
    const onOpenOwn = vi.fn();
    const user = userEvent.setup();
    render(<GamesSheet {...props({ onOpenGame, onOpenOwn })} />);
    expect(screen.queryByRole("button", { name: "Open Ana, Ben" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Open Cy, Dee" }));
    expect(onOpenGame).toHaveBeenCalledWith("bbbbbbbbbbbbbbbb");
    await user.click(screen.getByRole("button", { name: "Open Eve, Fay" }));
    expect(onOpenOwn).toHaveBeenCalledOnce();
  });

  it("asks before leaving, with Cancel focused, and says the game stays for everyone else", async () => {
    const onLeavingChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<GamesSheet {...props({ onLeavingChange })} />);
    await user.click(screen.getByRole("button", { name: "Leave Cy, Dee" }));
    expect(onLeavingChange).toHaveBeenCalledWith("bbbbbbbbbbbbbbbb");
    const onLeave = vi.fn();
    rerender(<GamesSheet {...props({ leaving: "bbbbbbbbbbbbbbbb", onLeavingChange, onLeave })} />);
    expect(screen.getByText(/It stays for everyone else/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Leave Cy, Dee" }));
    expect(onLeave).toHaveBeenCalledWith("bbbbbbbbbbbbbbbb");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onLeavingChange).toHaveBeenLastCalledWith(null);
  });

  it("says when there is nothing to list", () => {
    render(<GamesSheet {...props({ games: [], ownGame: null })} />);
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it("offers delete for everyone only to an editor, after a question that says so (REQ-0003-21)", async () => {
    const onConfirm = vi.fn();
    const onConfirmingChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<GamesSheet {...props()} />);
    expect(screen.queryByRole("button", { name: "Delete for everyone" })).toBeNull();
    const remove = { confirming: false, onConfirmingChange, onConfirm, problem: null };
    rerender(<GamesSheet {...props({ remove })} />);
    await user.click(screen.getByRole("button", { name: "Delete for everyone" }));
    expect(onConfirmingChange).toHaveBeenCalledWith(true);
    rerender(<GamesSheet {...props({ remove: { ...remove, confirming: true } })} />);
    expect(
      screen.getByText(/Delete this game for everyone\?.*nobody can open it again/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete the game" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("explains in text why a delete did not work", () => {
    const remove = {
      confirming: false,
      onConfirmingChange: vi.fn(),
      onConfirm: vi.fn(),
      problem: "Not now.",
    };
    render(<GamesSheet {...props({ remove })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Not now.");
  });
});

describe("HeaderButton", () => {
  it("is named by its label, for screen readers even where only the icon shows", async () => {
    const onClick = vi.fn();
    render(<HeaderButton label="Games" icon="games" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Games" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("WatchNotice: archived (REQ-0003-20)", () => {
  it("offers Duplicate into a new game, to an editor and a watcher alike", async () => {
    const onDuplicate = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<WatchNotice access="edit" archived onDuplicate={onDuplicate} />);
    await user.click(screen.getByRole("button", { name: "Duplicate into a new game" }));
    expect(onDuplicate).toHaveBeenCalledOnce();
    rerender(<WatchNotice access="watch" archived onDuplicate={onDuplicate} />);
    expect(screen.getByRole("button", { name: "Duplicate into a new game" })).toBeInTheDocument();
    expect(screen.getByText(/This game is archived/)).toBeInTheDocument();
  });

  it("offers nothing to duplicate for a live game", () => {
    render(<WatchNotice access="watch" archived={false} onDuplicate={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Duplicate into a new game" })).toBeNull();
  });
});
