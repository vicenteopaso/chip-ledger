import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSharedGame } from "@/app/useSharedGame";
import { type FetchOptions, type FetchOutcome, fetchGame } from "@/lib/infra/shared-game-client";
import { sharedSnapshot } from "@/test/unit/fixtures";

vi.mock("@/lib/infra/shared-game-client", () => ({ fetchGame: vi.fn() }));

const fetchMock = vi.mocked(fetchGame);
const ID = "abcdefghijklmnop";
const KEY = "A".repeat(22);

const snapshot = (rev: number, online: number | null = null): FetchOutcome => ({
  kind: "snapshot",
  snapshot: sharedSnapshot({ rev, online }),
});
const unchanged = (rev: number, online: number | null = null): FetchOutcome => ({
  kind: "unchanged",
  rev,
  archived: false,
  online,
});

/** Lets the next check run: advances the fake clock and the promises it is waiting on. */
const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

let hidden = false;
const setHidden = (value: boolean) => {
  hidden = value;
  document.dispatchEvent(new Event("visibilitychange"));
};

const calls = () => fetchMock.mock.calls.map(([options]) => options);

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useSharedGame", () => {
  it("does nothing without a key", async () => {
    const { result } = renderHook(() => useSharedGame(ID, null));
    await tick(10_000);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current).toEqual({ phase: "loading", status: "live" });
  });

  it("starts again for a different key instead of showing what the old one could see", async () => {
    fetchMock.mockResolvedValue(snapshot(1));
    const { result, rerender } = renderHook(({ key }) => useSharedGame(ID, key), {
      initialProps: { key: KEY },
    });
    await tick(0);
    expect(result.current).toMatchObject({ phase: "ready" });
    fetchMock.mockResolvedValue({ kind: "unavailable" });
    rerender({ key: "B".repeat(22) });
    expect(result.current).toEqual({ phase: "loading", status: "live" });
    await tick(0);
    expect(result.current).toEqual({ phase: "unavailable" });
  });

  it("REQ-0003-05: shows the game after the first check, which is also a heartbeat", async () => {
    fetchMock.mockResolvedValue(snapshot(1, 2));
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(result.current).toMatchObject({ phase: "ready", status: "live", online: 2 });
    const first = calls()[0];
    expect(first).toMatchObject({ id: ID, key: KEY });
    expect(first?.rev).toBeUndefined();
    expect(first?.connection).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("REQ-0003-10: asks every 2 s for a minute, then every 5 s", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue(unchanged(1));
    renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await tick(1999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calls()[1]?.rev).toBe(1);

    await tick(58_000); // to 60 s
    const atMinute = fetchMock.mock.calls.length;
    await tick(2000);
    expect(fetchMock).toHaveBeenCalledTimes(atMinute);
    await tick(3000);
    expect(fetchMock).toHaveBeenCalledTimes(atMinute + 1);
  });

  it("goes back to checking every 2 s when something changes", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue(unchanged(1));
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(70_000);
    const before = fetchMock.mock.calls.length;
    fetchMock.mockResolvedValueOnce(snapshot(2));
    await tick(5000);
    expect(result.current).toMatchObject({ phase: "ready", snapshot: { rev: 2 } });
    fetchMock.mockResolvedValue(unchanged(2));
    const afterChange = fetchMock.mock.calls.length;
    await tick(4000);
    expect(fetchMock.mock.calls.length - afterChange).toBe(2);
    expect(before).toBeGreaterThan(1);
  });

  it("REQ-0003-13: a heartbeat goes out every 45 s, not on every check", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue(unchanged(1, 4));
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(44_000);
    expect(calls().filter((options) => options.connection)).toHaveLength(1);
    await tick(2000);
    expect(calls().filter((options) => options.connection)).toHaveLength(2);
    expect(result.current).toMatchObject({ online: 4 });
  });

  it("keeps the last count when a check did not ask for one", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1, 3)).mockResolvedValueOnce(snapshot(2, null));
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(2000);
    expect(result.current).toMatchObject({ snapshot: { rev: 2 }, online: 3 });
  });

  it("REQ-0003-13, -14: missed checks show Reconnecting, then Offline, then Live again", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue({ kind: "error" });
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(result.current).toMatchObject({ status: "live" });
    await tick(2000); // first miss
    expect(result.current).toMatchObject({ phase: "ready", status: "reconnecting" });
    await tick(2000); // retry after 2 s: second miss
    expect(result.current).toMatchObject({ status: "reconnecting" });
    await tick(4000); // then 4 s: third miss
    expect(result.current).toMatchObject({ status: "offline" });
    fetchMock.mockResolvedValue(snapshot(2));
    await tick(8000);
    expect(result.current).toMatchObject({ status: "live", snapshot: { rev: 2 } });
  });

  it("REQ-0003-25: a busy answer is handled like a missed check", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue({ kind: "busy" });
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(2000);
    expect(result.current).toMatchObject({ status: "reconnecting" });
  });

  it("shows the connection problem before the first game arrives, without calling it unavailable", async () => {
    fetchMock.mockResolvedValue({ kind: "error" });
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(result.current).toEqual({ phase: "loading", status: "reconnecting" });
  });

  it("REQ-0003-26: stops asking once the game is not available", async () => {
    fetchMock.mockResolvedValue({ kind: "unavailable" });
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(result.current).toEqual({ phase: "unavailable" });
    await tick(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("an unavailable game stays that way even if a later miss arrives", async () => {
    fetchMock.mockResolvedValueOnce({ kind: "unavailable" });
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(result.current).toEqual({ phase: "unavailable" });
  });

  it("applies the short 'unchanged' answer to what is on screen", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue({
      kind: "unchanged",
      rev: 1,
      archived: true,
      online: 1,
    });
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(2000);
    expect(result.current).toMatchObject({ snapshot: { rev: 1 }, archived: true, online: 1 });
  });

  it("ignores an unchanged answer that arrives before any game", async () => {
    fetchMock.mockResolvedValue(unchanged(1));
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    expect(result.current).toEqual({ phase: "loading", status: "live" });
  });

  it("does not ask while the tab is hidden, and asks at once when it returns", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue(unchanged(1));
    renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    act(() => {
      setHidden(true);
    });
    const whenHidden = fetchMock.mock.calls.length;
    await tick(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(whenHidden);
    act(() => {
      setHidden(false);
    });
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(whenHidden + 1);
  });

  it("a check cancelled by hiding the tab is not a failure", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1));
    const { result } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    fetchMock.mockImplementation(
      (options: FetchOptions) =>
        new Promise<FetchOutcome>((resolve) => {
          options.signal?.addEventListener("abort", () => {
            resolve({ kind: "error" });
          });
        }),
    );
    await tick(2000); // a check is now in flight
    act(() => {
      setHidden(true);
    });
    await tick(0);
    expect(result.current).toMatchObject({ phase: "ready", status: "live" });
  });

  it("asks again when the browser comes back online", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue({ kind: "error" });
    renderHook(() => useSharedGame(ID, KEY));
    await tick(2000);
    const before = fetchMock.mock.calls.length;
    window.dispatchEvent(new Event("online"));
    await tick(0);
    expect(fetchMock.mock.calls.length).toBe(before + 1);
  });

  it("stops completely when the page goes away", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(1)).mockResolvedValue(unchanged(1));
    const { unmount } = renderHook(() => useSharedGame(ID, KEY));
    await tick(0);
    unmount();
    const before = fetchMock.mock.calls.length;
    await tick(60_000);
    act(() => {
      setHidden(false);
    });
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});
