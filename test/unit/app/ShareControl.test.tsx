import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareControl, type ShareControlProps } from "@/app/ShareControl";
import { copyToClipboard } from "@/lib/infra/clipboard";
import { keyFor, rememberKey, watchKeyFor } from "@/lib/infra/joined-games-storage";
import { createSharedGame, requestEditCode } from "@/lib/infra/shared-game-client";
import { SharedGameBodySchema } from "@/lib/shared-game";
import { defaultGame } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/shared-game-client", () => ({
  createSharedGame: vi.fn(),
  requestEditCode: vi.fn(),
}));
vi.mock("@/lib/infra/clipboard", () => ({ copyToClipboard: vi.fn() }));

const createMock = vi.mocked(createSharedGame);
const codeMock = vi.mocked(requestEditCode);
const copyMock = vi.mocked(copyToClipboard);
const ID = "abcdefghijklmnop";
const WATCH = "W".repeat(22);
const EDIT = "E".repeat(22);
const request = { started: true, game: SharedGameBodySchema.parse(defaultGame()) };

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

function mount(overrides: Partial<ShareControlProps> = {}) {
  const props: ShareControlProps = {
    open: true,
    onOpenChange: vi.fn(),
    shared: null,
    makeRequest: () => request,
    navigate: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ShareControl {...props} />) };
}

describe("sharing a solo game (REQ-0003-01, -22)", () => {
  it("shows what is kept and sends nothing until the host presses the button", () => {
    mount();
    expect(screen.getByText(/24 hours/)).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the shared game, keeps both keys on this device, and goes to it", async () => {
    createMock.mockResolvedValue({ kind: "created", id: ID, watchKey: WATCH, editKey: EDIT });
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Create the link" }));
    expect(createMock).toHaveBeenCalledWith(request);
    expect(props.navigate).toHaveBeenCalledWith(`/g/${ID}?share=1`);
    expect(keyFor(ID)).toBe(EDIT);
    expect(watchKeyFor(ID)).toBe(WATCH);
  });

  it.each([
    ["off", /isn't available right now/],
    ["busy", /busy/],
    ["error", /couldn't be created/],
  ] as const)("says in words when sharing %s, and lets the host try again", async (kind, text) => {
    createMock.mockResolvedValue({ kind });
    const user = userEvent.setup();
    const { props } = mount();
    await user.click(screen.getByRole("button", { name: "Create the link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(props.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Create the link" })).toBeInTheDocument();
  });
});

describe("an editor in a shared game (REQ-0003-03, -08)", () => {
  const editor = { id: ID, role: "edit", key: EDIT } as const;

  it("starts at Watch only and shows the watch link this device kept", () => {
    rememberKey(ID, EDIT, undefined, WATCH);
    mount({ shared: editor });
    expect(screen.getByRole("radio", { name: /Watch only/ })).toBeChecked();
    const link = screen.getByTestId("share-link").textContent;
    expect(link).toBe(`${window.location.origin}/g/${ID}#k=${WATCH}`);
  });

  it("changes the link and the code at once when Can edit is chosen", async () => {
    rememberKey(ID, EDIT, undefined, WATCH);
    const user = userEvent.setup();
    mount({ shared: editor });
    const before = screen.getByRole("img").getAttribute("d") ?? screen.getByRole("img").innerHTML;
    await user.click(screen.getByRole("radio", { name: /Can edit/ }));
    expect(screen.getByTestId("share-link")).toHaveTextContent(`#k=${EDIT}`);
    expect(screen.getByRole("img").innerHTML).not.toBe(before);
    expect(screen.getByRole("img")).toHaveAccessibleName(/can edit link/i);
  });

  it("starts at Watch only each time the sheet opens", async () => {
    rememberKey(ID, EDIT, undefined, WATCH);
    const user = userEvent.setup();
    const { rerender, props } = mount({ shared: editor });
    await user.click(screen.getByRole("radio", { name: /Can edit/ }));
    rerender(<ShareControl {...props} open={false} />);
    rerender(<ShareControl {...props} open />);
    expect(screen.getByRole("radio", { name: /Watch only/ })).toBeChecked();
  });

  it("does not offer a watch link it does not have, and says so", () => {
    mount({ shared: editor });
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/doesn't have the watch link/)).toBeInTheDocument();
  });

  it("copies the link and says so", async () => {
    rememberKey(ID, EDIT, undefined, WATCH);
    copyMock.mockResolvedValue(true);
    const user = userEvent.setup();
    mount({ shared: editor });
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(copyMock).toHaveBeenCalledWith(`${window.location.origin}/g/${ID}#k=${WATCH}`);
    expect(await screen.findByText("Link copied.")).toBeInTheDocument();
  });

  it("shows an edit code, and a new one replaces it", async () => {
    codeMock
      .mockResolvedValueOnce({ kind: "issued", code: "ABC234", expiresAt: 1 })
      .mockResolvedValueOnce({ kind: "issued", code: "XYZ789", expiresAt: 2 });
    const user = userEvent.setup();
    mount({ shared: editor });
    await user.click(screen.getByRole("button", { name: "Show edit code" }));
    expect(codeMock).toHaveBeenCalledWith({ id: ID, key: EDIT });
    expect(await screen.findByLabelText("Edit code: A B C 2 3 4")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "New code" }));
    expect(await screen.findByLabelText("Edit code: X Y Z 7 8 9")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit code: A B C 2 3 4")).toBeNull();
  });

  it.each([
    ["unavailable", /isn't available any more/],
    ["busy", /Too many codes/],
    ["error", /couldn't be created/],
  ] as const)("says in words when the code is %s", async (kind, text) => {
    codeMock.mockResolvedValue({ kind });
    const user = userEvent.setup();
    mount({ shared: editor });
    await user.click(screen.getByRole("button", { name: "Show edit code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
  });
});

describe("a watcher (REQ-0003-06, -08)", () => {
  it("can share the watch link, but has no edit link and no edit code", async () => {
    const user = userEvent.setup();
    mount({ shared: { id: ID, role: "watch", key: WATCH } });
    expect(screen.getByTestId("share-link")).toHaveTextContent(`#k=${WATCH}`);
    expect(screen.queryByRole("button", { name: "Show edit code" })).toBeNull();
    await user.click(screen.getByRole("radio", { name: /Can edit/ }));
    expect(screen.queryByTestId("share-link")).toBeNull();
    expect(screen.getByText(/A watcher can't offer an edit link/)).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Needs edit access/)).toBeInTheDocument();
  });
});

describe("the device's share menu", () => {
  it("is offered when the browser has one, and called with the link", async () => {
    rememberKey(ID, EDIT, undefined, WATCH);
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    try {
      const user = userEvent.setup();
      mount({ shared: { id: ID, role: "edit", key: EDIT } });
      await user.click(screen.getByRole("button", { name: "Share" }));
      expect(share).toHaveBeenCalledWith({
        title: "Chip Ledger game",
        url: `${window.location.origin}/g/${ID}#k=${WATCH}`,
      });
    } finally {
      Reflect.deleteProperty(navigator, "share");
    }
  });
});
