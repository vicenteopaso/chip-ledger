import { describe, expect, it } from "vitest";

import { type SharedAction, SharedGameBodySchema } from "@/lib/shared-game";
import {
  coalesceKey,
  enqueue,
  type PendingEdit,
  project,
  toEnvelope,
} from "@/lib/shared-game-queue";
import { defaultGame } from "@/test/unit/fixtures";

const edit = (action: SharedAction, id = "a", queuedAt = 1000): PendingEdit => ({
  actionId: `00000000-0000-4000-8000-00000000000${id}`,
  action,
  queuedAt,
});
const name = (playerId: string, text: string): SharedAction => ({
  type: "setName",
  playerId,
  name: text,
});
const base = { started: true, game: SharedGameBodySchema.parse(defaultGame()) };

describe("coalesceKey (REQ-0003-11)", () => {
  it("gives a field-setting edit a key of its own field", () => {
    expect(coalesceKey(name("p1", "A"))).toBe("name:p1");
    expect(coalesceKey(name("p2", "A"))).toBe("name:p2");
    expect(coalesceKey({ type: "setBuyIn", buyIn: 5 })).toBe("buy-in");
    expect(coalesceKey({ type: "setChipCount", chipId: "red", count: 1 })).toBe("chip-count:red");
    expect(coalesceKey({ type: "setChipValue", chipId: "red", value: 1 })).toBe("chip-value:red");
    expect(
      coalesceKey({ type: "setPlayerChipCount", playerId: "p1", chipId: "red", count: 2 }),
    ).toBe("player-chips:p1:red");
  });

  it("gives every other kind of setting a key", () => {
    const actions: SharedAction[] = [
      { type: "setPlayerCount", count: 3 },
      { type: "setCurrency", currency: "USD" },
      { type: "setChipColor", chipId: "red", color: "green" },
      { type: "setUniformValue", enabled: true },
      { type: "setUniformChipCount", count: 1 },
      { type: "setUniformChipValue", value: 1 },
      { type: "setScale", scale: true },
      { type: "setSpreadBy", spreadBy: "equal" },
    ];
    const keys = actions.map(coalesceKey);
    expect(keys.every((key) => typeof key === "string")).toBe(true);
    expect(new Set(keys).size).toBe(actions.length);
  });

  it("never merges edits that add, remove, or count up", () => {
    const actions: SharedAction[] = [
      { type: "adjustBuyins", playerId: "p1", delta: 1 },
      { type: "addChip", chipId: "c" },
      { type: "removeChip", chipId: "c" },
      { type: "applyPhotoCounts", playerId: "p1", counts: {} },
      { type: "autoFillChips", chipIds: ["a", "b", "c"] },
      { type: "startGame" },
    ];
    for (const action of actions) expect(coalesceKey(action)).toBeNull();
  });
});

describe("enqueue", () => {
  it("replaces the last unsent edit of the same field, keeping when it was first made", () => {
    const queue = enqueue(
      [edit(name("p1", "A"), "1", 1000)],
      edit(name("p1", "An"), "2", 1500),
      null,
    );
    expect(queue).toHaveLength(1);
    expect(queue[0]?.action).toEqual(name("p1", "An"));
    expect(queue[0]?.queuedAt).toBe(1000);
    expect(queue[0]?.actionId).toBe(edit(name("p1", "An"), "2").actionId);
  });

  it("does not touch an edit that is on its way", () => {
    const first = edit(name("p1", "A"), "1");
    const queue = enqueue([first], edit(name("p1", "An"), "2"), first.actionId);
    expect(queue).toHaveLength(2);
  });

  it("keeps edits of different fields, and anything that is not a setting", () => {
    let queue: PendingEdit[] = [];
    queue = enqueue(queue, edit(name("p1", "A"), "1"), null);
    queue = enqueue(queue, edit(name("p2", "B"), "2"), null);
    queue = enqueue(queue, edit({ type: "adjustBuyins", playerId: "p1", delta: 1 }, "3"), null);
    queue = enqueue(queue, edit({ type: "adjustBuyins", playerId: "p1", delta: 1 }, "4"), null);
    expect(queue).toHaveLength(4);
  });

  it("only merges with the edit just before, so order is never changed", () => {
    let queue: PendingEdit[] = [];
    queue = enqueue(queue, edit(name("p1", "A"), "1"), null);
    queue = enqueue(queue, edit({ type: "setBuyIn", buyIn: 30 }, "2"), null);
    queue = enqueue(queue, edit(name("p1", "AB"), "3"), null);
    expect(queue.map((e) => e.action.type)).toEqual(["setName", "setBuyIn", "setName"]);
  });
});

describe("project (REQ-0003-10)", () => {
  it("shows the server's game with each unconfirmed edit applied in order", () => {
    const shown = project(base, [
      edit({ type: "adjustBuyins", playerId: "p1", delta: 1 }, "1"),
      edit({ type: "adjustBuyins", playerId: "p1", delta: 1 }, "2"),
      edit(name("p1", "Ana"), "3"),
    ]);
    expect(shown.game.players[0]).toMatchObject({ name: "Ana", buyins: 3 });
    expect(base.game.players[0]?.buyins).toBe(1);
  });

  it("is the server's game when nothing is waiting", () => {
    expect(project(base, [])).toBe(base);
  });

  it("skips an edit that no longer applies instead of failing", () => {
    const broken = project(base, [
      edit({ type: "setBuyIn", buyIn: 0 }, "1"),
      edit({ type: "startGame" }, "2"),
      edit(name("p1", "Ana"), "3"),
    ]);
    expect(broken.game.players[0]?.name).toBe("Ana");
    expect(broken.game.buyIn).toBe(0);
  });
});

describe("toEnvelope (REQ-0003-14)", () => {
  it("says how long the edit waited, with no client clock to trust", () => {
    expect(toEnvelope(edit(name("p1", "A"), "1", 1000), 4, 3500)).toEqual({
      actionId: edit(name("p1", "A"), "1").actionId,
      baseRev: 4,
      queuedMs: 2500,
      action: name("p1", "A"),
    });
  });

  it("never sends a negative wait", () => {
    expect(toEnvelope(edit(name("p1", "A"), "1", 5000), 0, 1000).queuedMs).toBe(0);
  });
});
