import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SharedGameApp } from "@/app/SharedGameApp";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { keyFor, rememberKey } from "@/lib/infra/joined-games-storage";
import { type FetchOutcome, fetchGame } from "@/lib/infra/shared-game-client";
import { sharedSnapshot } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/shared-game-client", () => ({ fetchGame: vi.fn() }));
vi.mock("@/lib/infra/clipboard", () => ({ copyToClipboard: vi.fn() }));

const fetchMock = vi.mocked(fetchGame);
const copy = vi.mocked(copyToClipboard);
const ID = "abcdefghijklmnop";
const KEY = "K".repeat(22);

const snapshot = (overrides: Parameters<typeof sharedSnapshot>[0] = {}): FetchOutcome => ({
  kind: "snapshot",
  snapshot: sharedSnapshot(overrides),
});

const heading = () => screen.getByRole("heading", { level: 1 });
const announced = () =>
  screen
    .getAllByRole("status")
    .map((node) => node.textContent)
    .join(" ");

/** Opens the page the way a scanned link does: the key after the # (REQ-0003-04). */
async function open({ key = KEY, hash = true }: { key?: string | null; hash?: boolean } = {}) {
  window.history.replaceState(null, "", `/g/${ID}${hash && key ? `#k=${key}` : ""}`);
  const view = render(<SharedGameApp id={ID} footer={<span>footer</span>} />);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return view;
}

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SharedGameApp: joining", () => {
  it("REQ-0003-04: reads the key from the link, remembers it, and removes it from the address bar", async () => {
    fetchMock.mockResolvedValue(snapshot());
    await open();
    expect(keyFor(ID)).toBe(KEY);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe(`/g/${ID}`);
    expect(fetchMock.mock.calls[0]?.[0]).toMatchObject({ id: ID, key: KEY });
  });

  it("opens again after a reload, from the remembered key", async () => {
    rememberKey(ID, KEY);
    fetchMock.mockResolvedValue(snapshot());
    await open({ hash: false });
    expect(fetchMock.mock.calls[0]?.[0]).toMatchObject({ key: KEY });
    expect(heading()).toHaveTextContent("At the table");
  });

  it("REQ-0003-26: a link with no key, and no remembered one, is simply not available", async () => {
    await open({ key: null });
    expect(heading()).toHaveTextContent("This game isn’t available");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("REQ-0003-26: a game the server does not know shows the same page", async () => {
    fetchMock.mockResolvedValue({ kind: "unavailable" });
    await open();
    expect(heading()).toHaveTextContent("This game isn’t available");
    expect(screen.getByRole("link", { name: "Start a new game" })).toBeInTheDocument();
  });

  it("REQ-0003-04: a second link for the same game, opened in the same tab, replaces the key", async () => {
    const WRONG = "W".repeat(22);
    fetchMock.mockImplementation((options) =>
      Promise.resolve<FetchOutcome>(options.key === KEY ? snapshot() : { kind: "unavailable" }),
    );
    await open({ key: WRONG });
    expect(heading()).toHaveTextContent("This game isn’t available");

    await act(async () => {
      window.location.hash = `#k=${KEY}`;
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(heading()).toHaveTextContent("At the table");
    expect(keyFor(ID)).toBe(KEY);
    expect(window.location.hash).toBe("");
  });

  it("ignores a change of address that carries no key", async () => {
    fetchMock.mockResolvedValue(snapshot());
    await open();
    await act(async () => {
      window.location.hash = "#other";
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(heading()).toHaveTextContent("At the table");
  });

  it("says it is opening the game, and if it cannot be reached yet", async () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    await open();
    expect(screen.getByText("Opening the game…")).toBeInTheDocument();
  });

  it("shows a connection problem before the first game arrives", async () => {
    fetchMock.mockResolvedValue({ kind: "error" });
    await open();
    expect(screen.getByText("Couldn't reach the game. Trying again…")).toBeInTheDocument();
    expect(announced()).toContain("Reconnecting.");
  });
});

describe("SharedGameApp: watching", () => {
  it("REQ-0003-06, -29: shows the game read-only and says so in words", async () => {
    fetchMock.mockResolvedValue(snapshot());
    await open();
    expect(heading()).toHaveTextContent("At the table");
    expect(screen.getByText(/^Watch only/)).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy-in for/i })).toBeNull();
    expect(screen.getByText("Money in the pot")).toBeInTheDocument();
  });

  it("REQ-0003-13: shows how many devices are here", async () => {
    fetchMock.mockResolvedValue(snapshot({ online: 3 }));
    await open();
    expect(screen.getByText("Live · 3 here")).toBeInTheDocument();
  });

  it("says when someone has edit access that this device cannot edit yet", async () => {
    fetchMock.mockResolvedValue(snapshot({ role: "edit" }));
    await open();
    expect(screen.getByText(/edit access.*isn't available yet/i)).toBeInTheDocument();
  });

  it("REQ-0003-20: says a game is archived", async () => {
    fetchMock.mockResolvedValue(snapshot({ archived: true }));
    await open();
    expect(screen.getByText(/This game is archived/)).toBeInTheDocument();
  });

  it("REQ-0003-15, -18: each device moves between steps on its own, and focus follows", async () => {
    fetchMock.mockResolvedValue(snapshot());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Back to Setup" }));
    expect(heading()).toHaveTextContent("Setup");
    expect(heading()).toHaveFocus();
    expect(document.title).toBe("Setup · Chip Ledger");
    expect(screen.getByLabelText("Player 1 name")).toHaveAttribute("readonly");
    await user.click(screen.getByRole("button", { name: "See the table" }));
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    expect(heading()).toHaveTextContent("Cash out");
    await user.click(screen.getByRole("button", { name: "Settle up" }));
    expect(heading()).toHaveTextContent("Settle up");
    expect(screen.queryByRole("button", { name: "New game, same players" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Back to Cash out" }));
    expect(heading()).toHaveTextContent("Cash out");
    await user.click(screen.getByRole("button", { name: "Back to Table" }));
    expect(heading()).toHaveTextContent("At the table");
  });

  it("reopening the step you are on scrolls up and focuses its title", async () => {
    fetchMock.mockResolvedValue(snapshot());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: /Table/ }));
    expect(heading()).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("copies the results, as in a solo game, and falls back to text", async () => {
    fetchMock.mockResolvedValue(snapshot());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    await user.click(screen.getByRole("button", { name: "Settle up" }));
    copy.mockResolvedValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Copy results" }));
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(announced()).toContain("Results copied.");
    copy.mockResolvedValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Copied" }));
    expect(screen.getByLabelText("Results text")).toBeInTheDocument();
  });

  it("has the theme button and the footer", async () => {
    fetchMock.mockResolvedValue(snapshot());
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    expect(screen.getByText("footer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Theme:/ }));
    expect(screen.getByRole("button", { name: "Theme: Light" })).toBeInTheDocument();
  });
});

describe("SharedGameApp: waiting for the host", () => {
  it("REQ-0003-15: waits, then moves everyone to the table when the game starts", async () => {
    fetchMock.mockResolvedValue(snapshot({ started: false, rev: 1 }));
    await open();
    expect(heading()).toHaveTextContent("Waiting for the host");
    expect(screen.queryByRole("button", { name: "Cash out" })).toBeNull();
    expect(screen.getByText("Live")).toBeInTheDocument();

    fetchMock.mockResolvedValue(snapshot({ started: true, rev: 2 }));
    await tick(2000);
    expect(heading()).toHaveTextContent("At the table");
    expect(announced()).toContain("The game has started.");
  });

  it("does not pull a device back to the table when it joins a game already under way", async () => {
    fetchMock.mockResolvedValue(snapshot({ started: true }));
    await open();
    expect(heading()).toHaveTextContent("At the table");
    expect(announced()).not.toContain("The game has started.");
  });
});

describe("SharedGameApp: the connection", () => {
  it("REQ-0003-13, -14: shows Reconnecting then Offline in words, announces it, and recovers", async () => {
    fetchMock.mockResolvedValueOnce(snapshot());
    await open();
    fetchMock.mockResolvedValue({ kind: "error" });
    await tick(2000);
    expect(screen.getByText("Reconnecting…")).toBeInTheDocument();
    expect(announced()).toContain("Reconnecting.");
    await tick(6000);
    expect(screen.getByText(/^Offline/)).toBeInTheDocument();
    expect(announced()).toMatch(/offline/i);
    fetchMock.mockResolvedValue(snapshot({ rev: 2 }));
    await tick(8000);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(announced()).toContain("Live again.");
  });
});
