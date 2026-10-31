import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { EditCodeForm, type EditCodeFormProps } from "@/app/components/EditCodeForm";
import { ReadOnlyContext } from "@/app/components/ReadOnly";
import { QrCode } from "@/app/components/QrCode";
import { type ShareSheetProps, ShareSheet } from "@/app/components/ShareSheet";
import { qrModules } from "@/lib/qr";

const LINK = `https://x.example/g/abcdefghijklmnop#k=${"K".repeat(22)}`;

function props(overrides: Partial<ShareSheetProps> = {}): ShareSheetProps {
  return {
    open: true,
    onClose: vi.fn(),
    stage: "ready",
    problem: null,
    onCreate: vi.fn(),
    kind: "watch",
    onKindChange: vi.fn(),
    link: LINK,
    modules: qrModules(LINK),
    available: { watch: true, edit: true },
    copied: false,
    onCopy: vi.fn(),
    ...overrides,
  };
}

describe("QrCode (REQ-0003-28)", () => {
  it("draws an image with a text alternative, on a light plate with a quiet zone", () => {
    const modules = qrModules(LINK);
    render(<QrCode modules={modules} label="QR code for the link below" />);
    const image = screen.getByRole("img", { name: "QR code for the link below" });
    const size = modules.length + 8;
    expect(image).toHaveAttribute("viewBox", `0 0 ${String(size)} ${String(size)}`);
    expect(image.querySelector("rect")).toHaveClass("fill-qr-paper");
    expect(image.querySelector("path")).toHaveClass("fill-qr-ink");
    expect(image.querySelector("path")?.getAttribute("d")).toMatch(/^M4 4h7v1h-7z/);
  });
});

describe("ShareSheet content (REQ-0003-02, -03, -22)", () => {
  it("renders nothing while closed", () => {
    render(<ShareSheet {...props({ open: false })} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("before the game is shared, says what is kept and sends nothing until asked", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<ShareSheet {...props({ stage: "intro", link: null, modules: null, onCreate })} />);
    const dialog = screen.getByRole("dialog", { name: "Share this game" });
    expect(within(dialog).getByText(/24 hours/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("img")).toBeNull();
    expect(onCreate).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Create the link" }));
    expect(onCreate).toHaveBeenCalledOnce();
  });

  it("shows why a link could not be created, and ignores presses while it is being created", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(
      <ShareSheet
        {...props({
          stage: "creating",
          link: null,
          modules: null,
          problem: "Sharing is busy.",
          onCreate,
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Sharing is busy.");
    await user.click(screen.getByRole("button", { name: "Creating the link…" }));
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows the QR code, the same link as text, Copy link, and the retention notice", async () => {
    const onCopy = vi.fn();
    const user = userEvent.setup();
    render(<ShareSheet {...props({ onCopy })} />);
    const image = screen.getByRole("img");
    expect(image).toHaveAccessibleName(/watch only link.*written below.*Copy link/i);
    expect(screen.getByTestId("share-link")).toHaveTextContent(LINK);
    expect(screen.getByText(/kept until 24 hours/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("says when the link was copied", () => {
    render(<ShareSheet {...props({ copied: true })} />);
    expect(screen.getByText("Link copied.")).toBeInTheDocument();
  });

  it("offers the device's share menu only where there is one", async () => {
    const onNativeShare = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<ShareSheet {...props()} />);
    expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
    rerender(<ShareSheet {...props({ onNativeShare })} />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    expect(onNativeShare).toHaveBeenCalledOnce();
  });

  it("ends with the Watch only | Can edit radio group, set from the kind, and explains each", async () => {
    const onKindChange = vi.fn();
    const user = userEvent.setup();
    render(<ShareSheet {...props({ onKindChange })} />);
    const group = screen.getByRole("radiogroup", { name: "Who can use this link" });
    expect(within(group).getByRole("radio", { name: /Watch only/ })).toBeChecked();
    expect(within(group).getByRole("radio", { name: /Can edit/ })).not.toBeChecked();
    expect(within(group).getByText(/like a co-host/)).toBeInTheDocument();
    await user.click(within(group).getByRole("radio", { name: /Can edit/ }));
    expect(onKindChange).toHaveBeenCalledWith("edit");
    // The switch is the last thing in the sheet.
    const dialog = screen.getByRole("dialog");
    const all = Array.from(dialog.querySelectorAll("button, input"));
    expect(all.at(-1)).toHaveAttribute("type", "radio");
  });

  it("says so, instead of a code, when this device cannot offer that link", () => {
    render(
      <ShareSheet
        {...props({ link: null, modules: null, available: { watch: false, edit: true } })}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/doesn't have the watch link/)).toBeInTheDocument();
    expect(screen.getByText(/Not available on this device/)).toBeInTheDocument();
  });

  it("shows the edit code for an editor, in words a screen reader reads letter by letter", async () => {
    const onShow = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ShareSheet {...props({ editCode: { state: { kind: "hidden" }, onShow } })} />,
    );
    await user.click(screen.getByRole("button", { name: "Show edit code" }));
    expect(onShow).toHaveBeenCalledOnce();
    rerender(
      <ShareSheet {...props({ editCode: { state: { kind: "shown", code: "ABC234" }, onShow } })} />,
    );
    expect(screen.getByLabelText("Edit code: A B C 2 3 4")).toHaveTextContent("ABC234");
    expect(screen.getByText(/works for 10\s+minutes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New code" })).toBeInTheDocument();
    rerender(
      <ShareSheet
        {...props({ editCode: { state: { kind: "failed", text: "Not now." }, onShow } })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Not now.");
  });
});

describe("ShareSheet dialog behavior (REQ-0003-28, AC-0003-22)", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
        >
          Share
        </button>
        <ShareSheet
          {...props({
            open,
            onClose: () => {
              setOpen(false);
            },
          })}
        />
      </>
    );
  }

  it("moves focus in, keeps Tab inside, closes with Esc and returns focus to Share", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Share this game" })).toHaveFocus();

    // Tab goes round the dialog: past the last stop it comes back to the first. The radio group
    // is one stop, its checked button, so that is the last one here.
    const stops = [
      ...Array.from(dialog.querySelectorAll<HTMLElement>("button")),
      within(dialog).getByRole("radio", { name: /Watch only/ }),
    ];
    const last = stops.at(-1);
    last?.focus();
    await user.tab();
    expect(stops[0]).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Share" })).toHaveFocus();
  });

  it("the Close button also returns focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Share" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("button", { name: "Share" })).toHaveFocus();
  });
});

describe("EditCodeForm (REQ-0003-09)", () => {
  const form = (
    onSubmit: EditCodeFormProps["onSubmit"] = vi.fn(),
    onUpgraded: EditCodeFormProps["onUpgraded"] = vi.fn(),
  ) => render(<EditCodeForm onSubmit={onSubmit} onUpgraded={onUpgraded} />);

  it("starts as a button and opens a labelled field", async () => {
    const user = userEvent.setup();
    form();
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    expect(screen.getByRole("textbox", { name: "Edit code" })).toBeInTheDocument();
  });

  it("takes only the letters and numbers a code has, in capitals, at most six", async () => {
    const user = userEvent.setup();
    form();
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    const field = screen.getByRole("textbox", { name: "Edit code" });
    await user.type(field, "ab0c1-d2e3fgh");
    expect(field).toHaveValue("ABCD2E");
  });

  it("asks for all six before it asks the server", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    form(onSubmit);
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    await user.type(screen.getByRole("textbox", { name: "Edit code" }), "ABC");
    await user.click(screen.getByRole("button", { name: "Join as editor" }));
    expect(screen.getByRole("alert")).toHaveTextContent("6 letters and numbers");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hands the new key over when the code is accepted", async () => {
    const onSubmit = vi.fn(() =>
      Promise.resolve({ kind: "upgraded" as const, editKey: "N".repeat(22) }),
    );
    const onUpgraded = vi.fn();
    const user = userEvent.setup();
    form(onSubmit, onUpgraded);
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    await user.type(screen.getByRole("textbox", { name: "Edit code" }), "ABC234");
    await user.click(screen.getByRole("button", { name: "Join as editor" }));
    expect(onSubmit).toHaveBeenCalledWith("ABC234");
    expect(onUpgraded).toHaveBeenCalledWith("N".repeat(22));
  });

  it.each([
    ["refused", "That code didn't work."],
    ["locked", "Too many tries. Wait a minute and try again."],
    ["error", "The code couldn't be checked. Check your connection and try again."],
  ] as const)("says %s in words, and a changed code clears the message", async (kind, text) => {
    const onUpgraded = vi.fn();
    const user = userEvent.setup();
    form(() => Promise.resolve({ kind }), onUpgraded);
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    const field = screen.getByRole("textbox", { name: "Edit code" });
    await user.type(field, "ABC234");
    await user.click(screen.getByRole("button", { name: "Join as editor" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(text);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(onUpgraded).not.toHaveBeenCalled();
    await user.type(field, "{Backspace}");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stays typeable inside a read-only page, because that is where a watcher asks to edit", async () => {
    const user = userEvent.setup();
    render(
      <ReadOnlyContext value>
        <EditCodeForm onSubmit={vi.fn()} onUpgraded={vi.fn()} />
      </ReadOnlyContext>,
    );
    await user.click(screen.getByRole("button", { name: "I have an edit code" }));
    const field = screen.getByRole("textbox", { name: "Edit code" });
    await user.type(field, "ABC");
    expect(field).toHaveValue("ABC");
    expect(field).not.toHaveAttribute("aria-readonly");
  });
});
