import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SharedGameApp } from "@/app/SharedGameApp";
import { copyToClipboard } from "@/lib/infra/clipboard";
import {
  keyFor,
  listGames,
  rememberKey,
  stepFor,
  updateGame,
  watchKeyFor,
} from "@/lib/infra/joined-games-storage";
import {
  type FetchOutcome,
  fetchGame,
  sendEdit,
  upgradeWithCode,
} from "@/lib/infra/shared-game-client";
import { sharedSnapshot } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/shared-game-client", () => ({
  fetchGame: vi.fn(),
  sendEdit: vi.fn(),
  upgradeWithCode: vi.fn(),
  requestEditCode: vi.fn(),
  createSharedGame: vi.fn(),
}));
vi.mock("@/lib/infra/clipboard", () => ({ copyToClipboard: vi.fn() }));

const fetchMock = vi.mocked(fetchGame);
const sendMock = vi.mocked(sendEdit);
const upgradeMock = vi.mocked(upgradeWithCode);
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
    expect(screen.getByRole("button", { name: "New game, same players" })).toBeInTheDocument();
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

describe("SharedGameApp: editing (REQ-0003-07, -10, -14)", () => {
  const withBuyins = (rev: number, counts: Record<string, number>) => {
    const base = sharedSnapshot({ role: "edit", rev });
    return {
      ...base,
      game: {
        ...base.game,
        players: base.game.players.map((p) => ({ ...p, buyins: counts[p.id] ?? p.buyins })),
      },
    };
  };

  it("an editor has the buy-in buttons, and is not told they are only watching", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    await open();
    expect(screen.getByRole("button", { name: "Add a buy-in for Player 1" })).toBeInTheDocument();
    expect(screen.queryByText(/watch only/i)).toBeNull();
  });

  it("shows a rebuy at once, says it, and sends it to the server", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    sendMock.mockResolvedValue({ kind: "saved", snapshot: withBuyins(2, { p1: 2 }) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Add a buy-in for Player 1" }));
    expect(screen.getByRole("group", { name: "Buy-ins for Player 1" })).toHaveTextContent("2");
    expect(announced()).toContain("Player 1: 2 buy-ins, pot $100.00");
    await tick(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0].envelope.action).toEqual({
      type: "adjustBuyins",
      playerId: "p1",
      delta: 1,
    });
  });

  it("REQ-0003-29: says a change another device made, once, with the new pot", async () => {
    fetchMock.mockResolvedValueOnce({
      kind: "snapshot",
      snapshot: sharedSnapshot({ role: "edit" }),
    });
    await open();
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: withBuyins(2, { p2: 2 }) });
    await tick(2000);
    expect(announced()).toContain("Player 2: 2 buy-ins, pot $100.00");
  });

  it("REQ-0003-14: says when a change is waiting for the connection", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    sendMock.mockResolvedValue({ kind: "retry" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Add a buy-in for Player 1" }));
    await tick(0);
    expect(screen.getByText("Reconnecting… your changes will sync.")).toBeInTheDocument();
    expect(announced()).toContain("Reconnecting.");
    expect(screen.getByRole("group", { name: "Buy-ins for Player 1" })).toHaveTextContent("2");
  });

  it("REQ-0003-23: shows and says why a change was not saved, and can be dismissed", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    sendMock.mockResolvedValue({ kind: "rejected", reason: "stale" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Add a buy-in for Player 1" }));
    await tick(0);
    expect(
      screen.getAllByText("That change waited too long offline, so it wasn't saved.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: "Buy-ins for Player 1" })).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
  });

  it("an archived game is read-only even for an editor", async () => {
    fetchMock.mockResolvedValue({
      kind: "snapshot",
      snapshot: sharedSnapshot({ role: "edit", archived: true }),
    });
    await open();
    expect(screen.queryByRole("button", { name: /Add a buy-in/ })).toBeNull();
    expect(screen.getByText(/This game is archived/)).toBeInTheDocument();
  });

  it("Cash out: typing a count sends it", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    sendMock.mockResolvedValue({
      kind: "saved",
      snapshot: sharedSnapshot({ role: "edit", rev: 2 }),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    await user.type(screen.getByLabelText("White chips for Player 1"), "7");
    await tick(0);
    expect(sendMock.mock.calls.at(-1)?.[0].envelope.action).toMatchObject({
      type: "setPlayerChipCount",
      playerId: "p1",
      count: 7,
    });
  });

  it("Settle: an editor can change how the difference is shared, and can start a new game on this device", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    sendMock.mockResolvedValue({
      kind: "saved",
      snapshot: sharedSnapshot({ role: "edit", rev: 2 }),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    await user.click(screen.getByRole("button", { name: "Settle up" }));
    expect(screen.getByRole("button", { name: /start over from scratch/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New game, same players" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Equally/ }));
    await tick(0);
    expect(sendMock.mock.calls.at(-1)?.[0].envelope.action).toEqual({
      type: "setSpreadBy",
      spreadBy: "equal",
    });
    await user.click(screen.getByRole("checkbox", { name: /Share the/ }));
    await tick(0);
    expect(sendMock.mock.calls.at(-1)?.[0].envelope.action).toEqual({
      type: "setScale",
      scale: false,
    });
  });
});

describe("SharedGameApp: chip sales (SPEC-0004)", () => {
  it("REQ-0004-08: an editor sells chips; it shows at once and is sent as sellChips", async () => {
    const base = sharedSnapshot({ role: "edit", rev: 2 });
    const saved = {
      ...base,
      game: {
        ...base.game,
        players: base.game.players.map((p) =>
          p.id === "p1" ? { ...p, moved: -5 } : p.id === "p2" ? { ...p, moved: 5 } : p,
        ),
      },
    };
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    sendMock.mockResolvedValue({ kind: "saved", snapshot: saved });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Sell chips" }));
    await user.type(screen.getByRole("textbox", { name: /^Amount in/ }), "5");
    await user.click(screen.getByRole("button", { name: "Record sale" }));
    expect(screen.getByText("$15.00 in")).toBeInTheDocument();
    expect(screen.getByText("$25.00 in")).toBeInTheDocument();
    expect(announced()).toContain("Chip sale: Player 1 now $15.00 in, Player 2 now $25.00 in");
    await tick(0);
    expect(sendMock.mock.calls.at(-1)?.[0].envelope.action).toEqual({
      type: "sellChips",
      sellerId: "p1",
      buyerId: "p2",
      amount: 5,
    });
  });

  it("REQ-0004-09: a watcher has no Sell chips button", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "watch" }) });
    await open();
    expect(screen.queryByRole("button", { name: "Sell chips" })).toBeNull();
  });
});

describe("SharedGameApp: setting up and starting (REQ-0003-15)", () => {
  const notStarted = (overrides: Parameters<typeof sharedSnapshot>[0] = {}): FetchOutcome => ({
    kind: "snapshot",
    snapshot: sharedSnapshot({ role: "edit", started: false, ...overrides }),
  });

  it("the host fills in Setup and starts the game; the page moves on to the table", async () => {
    fetchMock.mockResolvedValue(notStarted());
    sendMock.mockResolvedValueOnce({
      kind: "saved",
      snapshot: sharedSnapshot({ role: "edit", started: false, rev: 2 }),
    });
    sendMock.mockResolvedValue({
      kind: "saved",
      snapshot: sharedSnapshot({ role: "edit", rev: 3 }),
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    expect(heading()).toHaveTextContent("Setup");
    expect(screen.queryByRole("navigation")).toBeNull();
    await user.type(screen.getByLabelText("Player 1 name"), "A");
    await tick(0);
    expect(sendMock.mock.calls.at(-1)?.[0].envelope.action).toMatchObject({
      type: "setName",
      playerId: "p1",
    });
    await user.click(screen.getByRole("button", { name: "Start the game" }));
    await tick(0);
    expect(sendMock.mock.calls.at(-1)?.[0].envelope.action).toEqual({ type: "startGame" });
    expect(heading()).toHaveTextContent("At the table");
    expect(announced()).toContain("The game has started.");
  });

  it("REQ-0002-08: Start the game stays focusable when it cannot be used, and leads to the problem", async () => {
    const snapshot = sharedSnapshot({ role: "edit", started: false });
    fetchMock.mockResolvedValue({
      kind: "snapshot",
      snapshot: { ...snapshot, game: { ...snapshot.game, buyIn: 0 } },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    const start = screen.getByRole("button", { name: "Start the game" });
    expect(start).toHaveAttribute("aria-disabled", "true");
    await user.click(start);
    expect(screen.getByLabelText(/^Buy-in/)).toHaveFocus();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("a watcher still just waits", async () => {
    fetchMock.mockResolvedValue(notStarted({ role: "watch" }));
    await open();
    expect(heading()).toHaveTextContent("Waiting for the host");
    expect(screen.queryByRole("button", { name: "Start the game" })).toBeNull();
  });
});

describe("SharedGameApp: sharing and edit codes (SPEC-0003 REQ-0003-02, -09)", () => {
  it("has a Share button on every step that opens the sheet for this game", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "watch" }) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.getByRole("dialog", { name: "Share this game" })).toBeInTheDocument();
    expect(screen.getByTestId("share-link")).toHaveTextContent(`/g/${ID}#k=${KEY}`);
  });

  it("opens the sheet by itself when the host arrives from Create the link, and tidies the address", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    window.history.replaceState(null, "", `/g/${ID}?share=1`);
    rememberKey(ID, KEY, undefined, "W".repeat(22));
    const view = render(<SharedGameApp id={ID} footer={<span>footer</span>} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(view.container).toBeTruthy();
    expect(screen.getByRole("dialog", { name: "Share this game" })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("does not offer Share while the game cannot be opened", async () => {
    fetchMock.mockResolvedValue({ kind: "unavailable" });
    await open();
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
  });

  it("a watcher can enter the edit code and become an editor on this device", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "watch" }) });
    upgradeMock.mockResolvedValue({ kind: "upgraded", editKey: "N".repeat(22) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    expect(screen.queryByRole("button", { name: "Sell chips" })).toBeNull();
    fetchMock.mockResolvedValue({
      kind: "snapshot",
      snapshot: sharedSnapshot({ role: "edit", rev: 2 }),
    });
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    await user.type(screen.getByRole("textbox", { name: "Edit code" }), "abc234");
    await user.click(screen.getByRole("button", { name: "Join as editor" }));
    expect(upgradeMock).toHaveBeenCalledWith({ id: ID, key: KEY, code: "ABC234" });
    await tick(0);
    expect(keyFor(ID)).toBe("N".repeat(22));
    expect(watchKeyFor(ID)).toBe(KEY);
    expect(announced()).toContain("You can now edit this game.");
    expect(await screen.findByRole("button", { name: "Sell chips" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I have an edit code" })).toBeNull();
  });

  it("a wrong code leaves the person a watcher and says so", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "watch" }) });
    upgradeMock.mockResolvedValue({ kind: "refused" });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    await user.type(screen.getByRole("textbox", { name: "Edit code" }), "ABC234");
    await user.click(screen.getByRole("button", { name: "Join as editor" }));
    expect(await screen.findByText("That code didn't work.")).toBeInTheDocument();
    expect(keyFor(ID)).toBe(KEY);
  });

  it("an editor, or an archived game, is not offered the code form", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    await open();
    expect(screen.queryByRole("button", { name: "I have an edit code" })).toBeNull();
  });
});

describe("SharedGameApp: a new game from a shared one (SPEC-0003 REQ-0003-16)", () => {
  async function openWithNavigate(role: "watch" | "edit") {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role }) });
    const navigate = vi.fn();
    window.history.replaceState(null, "", `/g/${ID}#k=${KEY}`);
    render(<SharedGameApp id={ID} footer={<span>footer</span>} navigate={navigate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    return navigate;
  }

  it("New game, same players saves a fresh private game with the same names and leaves the shared one alone", async () => {
    const navigate = await openWithNavigate("watch");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    await user.click(screen.getByRole("button", { name: "Settle up" }));
    await user.click(screen.getByRole("button", { name: "New game, same players" }));
    const saved = JSON.parse(localStorage.getItem("chip-ledger.v1") ?? "null") as {
      screen: string;
      players: { buyins: number; moved: number; counts: object }[];
    };
    expect(saved.screen).toBe("table");
    expect(saved.players.every((p) => p.buyins === 1 && p.moved === 0)).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/");
    expect(sendMock).not.toHaveBeenCalled();
    expect(keyFor(ID)).toBe(KEY);
  });

  it("Start over from scratch asks first, then saves a blank game on this device", async () => {
    const navigate = await openWithNavigate("edit");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    await user.click(screen.getByRole("button", { name: "Settle up" }));
    await user.click(screen.getByRole("button", { name: "Start over from scratch" }));
    expect(screen.getByText(/Leave this game and start from scratch/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Erase everything" }));
    const saved = JSON.parse(localStorage.getItem("chip-ledger.v1") ?? "null") as {
      screen: string;
    };
    expect(saved.screen).toBe("setup");
    expect(navigate).toHaveBeenCalledWith("/");
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe("SharedGameApp: the Games list and archived games (SPEC-0003 REQ-0003-17 to -20)", () => {
  it("records what the Games list shows: the players, what this device can do, and when", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    await open();
    const [entry] = listGames();
    expect(entry).toMatchObject({ id: ID, role: "edit", title: "Game with 4 players" });
    expect(entry?.visited).toBeGreaterThan(0);
  });

  it("remembers the step on this device and opens the game there again (REQ-0003-18)", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "watch" }) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const first = await open();
    await user.click(screen.getByRole("button", { name: "Cash out" }));
    expect(stepFor(ID)).toBe("cashout");
    first.unmount();
    rememberKey(ID, KEY);
    await open();
    expect(heading()).toHaveTextContent("Cash out");
  });

  it("opens a game at the step it was last on, from a fresh visit", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "watch" }) });
    rememberKey(ID, KEY);
    updateGame(ID, { step: "settle" });
    await open({ hash: false });
    expect(heading()).toHaveTextContent("Settle up");
  });

  it("has a Games button that lists this game", async () => {
    fetchMock.mockResolvedValue({ kind: "snapshot", snapshot: sharedSnapshot({ role: "edit" }) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await open();
    await user.click(screen.getByRole("button", { name: "Games" }));
    const dialog = screen.getByRole("dialog", { name: "Games" });
    expect(dialog).toHaveTextContent("Game with 4 players");
    expect(dialog).toHaveTextContent("Can edit · Open now");
    expect(screen.getByRole("button", { name: "Delete for everyone" })).toBeInTheDocument();
  });

  it("an archived game is read-only for everyone and can be duplicated into a new private game", async () => {
    fetchMock.mockResolvedValue({
      kind: "snapshot",
      snapshot: sharedSnapshot({ role: "watch", archived: true }),
    });
    const navigate = vi.fn();
    window.history.replaceState(null, "", `/g/${ID}#k=${KEY}`);
    render(<SharedGameApp id={ID} footer={<span>footer</span>} navigate={navigate} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    expect(screen.getByText(/This game is archived/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add a buy-in/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Duplicate into a new game" }));
    const saved = JSON.parse(localStorage.getItem("chip-ledger.v1") ?? "null") as {
      screen: string;
      players: { buyins: number }[];
    };
    expect(saved.screen).toBe("table");
    expect(saved.players.every((p) => p.buyins === 1)).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/");
    expect(sendMock).not.toHaveBeenCalled();
  });
});
