import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GamesControl, type GamesControlProps } from "@/app/GamesControl";
import { saveGame } from "@/lib/infra/game-storage";
import { keyFor, listGames, rememberKey, updateGame } from "@/lib/infra/joined-games-storage";
import { deleteSharedGame } from "@/lib/infra/shared-game-client";
import { defaultGame } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/shared-game-client", () => ({ deleteSharedGame: vi.fn() }));

const deleteMock = vi.mocked(deleteSharedGame);
const A = "aaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbb";

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  rememberKey(A, "A".repeat(22));
  rememberKey(B, "B".repeat(22));
  updateGame(A, { title: "Ana, Ben", role: "edit", visited: 2 });
  updateGame(B, { title: "Cy, Dee", role: "watch", visited: 1 });
});

function mount(overrides: Partial<GamesControlProps> = {}) {
  const props: GamesControlProps = {
    open: true,
    onOpenChange: vi.fn(),
    current: { id: A, key: "A".repeat(22), role: "edit" },
    navigate: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<GamesControl {...props} />) };
}

describe("GamesControl (REQ-0003-17, -18, -21)", () => {
  it("lists the games on this device, the open one marked, newest first", () => {
    mount();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[0]).toContain("Ana, Ben");
    expect(items[0]).toContain("Open now");
    expect(items[1]).toContain("Cy, Dee");
  });

  it("opens another game at its link, which reopens at the step last used", async () => {
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Open Cy, Dee" }));
    expect(props.navigate).toHaveBeenCalledWith(`/g/${B}`);
  });

  it("shows this device's own game, read from storage, and opens it", async () => {
    const game = {
      ...defaultGame(),
      players: defaultGame().players.map((p, i) => ({ ...p, name: ["Eve", "Fay"][i] ?? "" })),
      count: 2,
    };
    saveGame(game);
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Open Eve, Fay" }));
    expect(props.navigate).toHaveBeenCalledWith("/");
  });

  it("leaving another game removes it from this device only, and keeps the sheet open", async () => {
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Leave Cy, Dee" }));
    await user.click(screen.getAllByRole("button", { name: "Leave Cy, Dee" })[0] ?? document.body);
    expect(keyFor(B)).toBeNull();
    expect(keyFor(A)).not.toBeNull();
    expect(listGames().map((g) => g.id)).toEqual([A]);
    expect(screen.queryByText("Cy, Dee")).toBeNull();
    expect(props.navigate).not.toHaveBeenCalled();
  });

  it("leaving the game on screen goes to this device's own game", async () => {
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Leave Ana, Ben" }));
    await user.click(screen.getAllByRole("button", { name: "Leave Ana, Ben" })[0] ?? document.body);
    expect(keyFor(A)).toBeNull();
    expect(props.navigate).toHaveBeenCalledWith("/");
  });

  it("an editor deletes the open game for everyone, forgets it here, and goes home", async () => {
    deleteMock.mockResolvedValue({ kind: "deleted" });
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Delete for everyone" }));
    await user.click(screen.getByRole("button", { name: "Delete the game" }));
    expect(deleteMock).toHaveBeenCalledWith({ id: A, key: "A".repeat(22) });
    expect(keyFor(A)).toBeNull();
    expect(props.navigate).toHaveBeenCalledWith("/");
  });

  it.each([
    ["forbidden", /Only someone who can edit/],
    ["error", /couldn't be deleted/],
  ] as const)("keeps the game and says why when delete is %s", async (kind, text) => {
    deleteMock.mockResolvedValue({ kind });
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Delete for everyone" }));
    await user.click(screen.getByRole("button", { name: "Delete the game" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(keyFor(A)).not.toBeNull();
    expect(props.navigate).not.toHaveBeenCalled();
  });

  it("offers no delete to a watcher, or on this device's own game", () => {
    const { unmount } = mount({ current: { id: A, key: "A".repeat(22), role: "watch" } });
    expect(screen.queryByRole("button", { name: "Delete for everyone" })).toBeNull();
    unmount();
    mount({ current: null });
    expect(screen.queryByRole("button", { name: "Delete for everyone" })).toBeNull();
  });
});
