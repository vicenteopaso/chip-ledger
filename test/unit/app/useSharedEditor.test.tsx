import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSharedEditor } from "@/app/useSharedEditor";
import type { SharedGameView } from "@/app/useSharedGame";
import { type SendOutcome, sendEdit } from "@/lib/infra/shared-game-client";
import type { GameSnapshot, SharedAction } from "@/lib/shared-game";
import { sharedSnapshot } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/shared-game-client", () => ({ sendEdit: vi.fn() }));

const sendMock = vi.mocked(sendEdit);
const ID = "abcdefghijklmnop";
const KEY = "E".repeat(22);

const readyView = (snapshot: GameSnapshot = sharedSnapshot({ role: "edit" })): SharedGameView => ({
  phase: "ready",
  snapshot,
  archived: false,
  online: null,
  status: "live",
});

let ids = 0;
const newId = () => `00000000-0000-4000-8000-${String((ids += 1)).padStart(12, "0")}`;
const rename = (name: string): SharedAction => ({ type: "setName", playerId: "p1", name });
const rebuy: SharedAction = { type: "adjustBuyins", playerId: "p1", delta: 1 };

const saved = (rev: number, snapshot = sharedSnapshot({ role: "edit", rev })): SendOutcome => ({
  kind: "saved",
  snapshot,
});

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function setup(view: SharedGameView = readyView(), key: string | null = KEY) {
  const receive = vi.fn();
  const hook = renderHook(
    (props: { view: SharedGameView; key: string | null; id: string }) =>
      useSharedEditor({ id: props.id, key: props.key, feed: { view: props.view, receive }, newId }),
    { initialProps: { view, key, id: ID } },
  );
  return { receive, ...hook };
}

const player = (view: SharedGameView) =>
  view.phase === "ready" ? view.snapshot.game.players[0] : undefined;

beforeEach(() => {
  vi.useFakeTimers();
  ids = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSharedEditor", () => {
  it("REQ-0003-10: shows a change at once, before the server has answered", () => {
    sendMock.mockImplementation(() => new Promise(() => undefined));
    const { result } = setup();
    expect(player(result.current.view)?.name).toBe("");
    act(() => {
      result.current.send(rename("Ana"));
    });
    expect(player(result.current.view)?.name).toBe("Ana");
    expect(result.current.pending).toBe(1);
  });

  it("sends the edit with the revision it was made against, then takes in the answer", async () => {
    sendMock.mockResolvedValue(saved(2));
    const { result, receive } = setup(readyView(sharedSnapshot({ role: "edit", rev: 1 })));
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const options = sendMock.mock.calls[0]?.[0];
    expect(options).toMatchObject({ id: ID, key: KEY });
    expect(options?.envelope).toMatchObject({ baseRev: 1, action: rename("Ana"), queuedMs: 0 });
    expect(receive).toHaveBeenCalledWith(expect.objectContaining({ rev: 2 }));
    expect(result.current.pending).toBe(0);
  });

  it("REQ-0003-11: sends edits one at a time, in the order they were made", async () => {
    const answers: ((value: SendOutcome) => void)[] = [];
    sendMock.mockImplementation(
      () =>
        new Promise<SendOutcome>((resolve) => {
          answers.push(resolve);
        }),
    );
    const { result } = setup();
    act(() => {
      result.current.send(rebuy);
      result.current.send({ type: "adjustBuyins", playerId: "p2", delta: 1 });
    });
    await tick(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]?.[0].envelope.action).toMatchObject({ playerId: "p1" });
    await act(async () => {
      answers[0]?.(saved(2));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[1]?.[0].envelope.action).toMatchObject({ playerId: "p2" });
  });

  it("sends only the latest text when a field is typed in faster than it is sent", async () => {
    const answers: ((value: SendOutcome) => void)[] = [];
    sendMock.mockImplementation(
      () =>
        new Promise<SendOutcome>((resolve) => {
          answers.push(resolve);
        }),
    );
    const { result } = setup();
    act(() => {
      result.current.send(rename("A"));
    });
    await tick(0); // "A" is on its way
    act(() => {
      result.current.send(rename("An"));
      result.current.send(rename("Ana"));
    });
    expect(result.current.pending).toBe(2); // the one on its way, and one for "An" and "Ana"
    await act(async () => {
      answers[0]?.(saved(2));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(sendMock.mock.calls[1]?.[0].envelope.action).toEqual(rename("Ana"));
  });

  it("REQ-0003-14: keeps an edit it cannot send, retries with the same id and a growing wait", async () => {
    sendMock.mockResolvedValue({ kind: "retry" });
    const { result } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(result.current.view).toMatchObject({ status: "reconnecting" });
    expect(player(result.current.view)?.name).toBe("Ana");
    await tick(2000); // first retry, after 2 s
    expect(sendMock).toHaveBeenCalledTimes(2);
    await tick(4000); // then 4 s
    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(result.current.view).toMatchObject({ status: "offline" });
    const ids = sendMock.mock.calls.map((call) => call[0].envelope.actionId);
    expect(new Set(ids).size).toBe(1);
    expect(result.current.pending).toBe(1);
  });

  it("says how long an edit waited, and goes back to live when it is finally saved", async () => {
    sendMock.mockResolvedValueOnce({ kind: "retry" }).mockResolvedValue(saved(2));
    const { result } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    await tick(2000);
    expect(sendMock.mock.calls[1]?.[0].envelope.queuedMs).toBeGreaterThanOrEqual(2000);
    expect(result.current.view).toMatchObject({ status: "live" });
    expect(result.current.pending).toBe(0);
  });

  it("REQ-0003-23: drops an edit the server will not accept, and says why", async () => {
    sendMock.mockResolvedValue({ kind: "rejected", reason: "archived" });
    const { result } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    expect(result.current.pending).toBe(0);
    expect(result.current.rejected).toBe("This game is archived, so that change wasn't saved.");
    expect(player(result.current.view)?.name).toBe("");
    act(() => {
      result.current.dismissRejected();
    });
    expect(result.current.rejected).toBeNull();
  });

  it("has a reason for every kind of refusal", async () => {
    const reasons = ["forbidden", "stale", "invalid", "too_large"] as const;
    for (const reason of reasons) {
      sendMock.mockResolvedValueOnce({ kind: "rejected", reason });
      const { result, unmount } = setup();
      act(() => {
        result.current.send(rename("Ana"));
      });
      await tick(0);
      expect(result.current.rejected).toMatch(/wasn't saved|too large/);
      unmount();
    }
  });

  it("clears the reason when the next change is saved", async () => {
    sendMock
      .mockResolvedValueOnce({ kind: "rejected", reason: "invalid" })
      .mockResolvedValue(saved(2));
    const { result } = setup();
    act(() => {
      result.current.send(rebuy);
    });
    await tick(0);
    expect(result.current.rejected).not.toBeNull();
    act(() => {
      result.current.send({ type: "adjustBuyins", playerId: "p2", delta: 1 });
    });
    await tick(0);
    expect(result.current.rejected).toBeNull();
  });

  it("REQ-0003-26: gives up on edits when the game is gone", async () => {
    sendMock.mockResolvedValue({ kind: "unavailable" });
    const { result } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    expect(result.current.pending).toBe(0);
    await tick(60_000);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("applies the server's game under the edits still waiting", () => {
    sendMock.mockImplementation(() => new Promise(() => undefined));
    const { result, rerender } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    const others = sharedSnapshot({ role: "edit", rev: 5 });
    const changed = {
      ...others,
      game: {
        ...others.game,
        players: others.game.players.map((p, i) => (i === 1 ? { ...p, name: "Ben" } : p)),
      },
    };
    rerender({ view: readyView(changed), key: KEY, id: ID });
    const shown = result.current.view;
    expect(
      shown.phase === "ready" && shown.snapshot.game.players.map((p) => p.name).slice(0, 2),
    ).toEqual(["Ana", "Ben"]);
  });

  it("does not send without a key or while the game is not open", async () => {
    sendMock.mockResolvedValue(saved(2));
    const { result } = setup({ phase: "loading", status: "live" }, null);
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    expect(sendMock).not.toHaveBeenCalled();
    expect(result.current.view).toEqual({ phase: "loading", status: "live" });
  });

  it("starts empty for a different game or key", () => {
    sendMock.mockImplementation(() => new Promise(() => undefined));
    const { result, rerender } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    expect(result.current.pending).toBe(1);
    rerender({ view: readyView(), key: "F".repeat(22), id: ID });
    expect(result.current.pending).toBe(0);
    expect(player(result.current.view)?.name).toBe("");
  });

  it("keeps the worse of the polling status and the sending status", async () => {
    sendMock.mockResolvedValue({ kind: "retry" });
    const polling: SharedGameView = {
      ...(readyView() as Extract<SharedGameView, { phase: "ready" }>),
      status: "offline",
    };
    const { result } = setup(polling);
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    expect(result.current.view).toMatchObject({ status: "offline" });
  });

  it("stops sending when it goes away", async () => {
    sendMock.mockResolvedValue({ kind: "retry" });
    const { result, unmount } = setup();
    act(() => {
      result.current.send(rename("Ana"));
    });
    await tick(0);
    unmount();
    const before = sendMock.mock.calls.length;
    await tick(60_000);
    expect(sendMock.mock.calls.length).toBe(before);
  });
});
