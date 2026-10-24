import { describe, expect, it } from "vitest";

import { CHIP_COLORS } from "@/lib/chips";
import { type GameState, stackChips, stackValue, UNIFORM_CHIP_ID } from "@/lib/game";
import { gameReducer, NEW_CHIP_COUNT, NEW_CHIP_VALUE } from "@/lib/game-reducer";
import { defaultGame, gameWith } from "@/test/unit/fixtures";

const player = (game: GameState, id: string) => game.players.find((p) => p.id === id);

describe("gameReducer", () => {
  it("REQ-0001-01: opens any step", () => {
    expect(gameReducer(defaultGame(), { type: "go", screen: "settle" }).screen).toBe("settle");
  });

  it("REQ-0001-03: switching player count keeps every slot's name", () => {
    let game = gameReducer(defaultGame(), { type: "setName", playerId: "p6", name: "Fay" });
    game = gameReducer(game, { type: "setPlayerCount", count: 4 });
    game = gameReducer(game, { type: "setPlayerCount", count: 6 });
    expect(game.count).toBe(6);
    expect(player(game, "p6")?.name).toBe("Fay");
  });

  it("REQ-0001-04: sets buy-in and currency", () => {
    let game = gameReducer(defaultGame(), { type: "setBuyIn", buyIn: 12.5 });
    game = gameReducer(game, { type: "setCurrency", currency: "EUR" });
    expect(game).toMatchObject({ buyIn: 12.5, currency: "EUR" });
  });

  it("REQ-0001-05: adds the first unused color with count 5 and value 5", () => {
    const game = gameReducer(defaultGame(), { type: "addChip", chipId: "new" });
    expect(game.chips.at(-1)).toEqual({
      id: "new",
      color: "green",
      count: NEW_CHIP_COUNT,
      value: NEW_CHIP_VALUE,
    });
  });

  it("REQ-0001-05: adds nothing once every color is used", () => {
    const chips = CHIP_COLORS.map((color) => ({ id: color, color, count: 1, value: 1 }));
    const game = gameWith({ chips });
    expect(gameReducer(game, { type: "addChip", chipId: "x" })).toBe(game);
  });

  it("REQ-0001-05: removes a row but never the last one", () => {
    const game = gameReducer(defaultGame(), { type: "removeChip", chipId: "red" });
    expect(game.chips.map((c) => c.id)).toEqual(["white", "blue"]);
    const single = gameWith({ chips: [{ id: "red", color: "red", count: 1, value: 1 }] });
    expect(gameReducer(single, { type: "removeChip", chipId: "red" })).toBe(single);
  });

  it("REQ-0001-05: changes a row's color, count and value, refusing a color in use", () => {
    let game = gameReducer(defaultGame(), { type: "setChipColor", chipId: "red", color: "black" });
    game = gameReducer(game, { type: "setChipCount", chipId: "red", count: 3 });
    game = gameReducer(game, { type: "setChipValue", chipId: "red", value: 2 });
    expect(game.chips[1]).toEqual({ id: "red", color: "black", count: 3, value: 2 });
    expect(gameReducer(game, { type: "setChipColor", chipId: "red", color: "white" })).toBe(game);
  });

  it("REQ-0001-08: adds and removes buy-ins without going below 0", () => {
    let game = gameReducer(defaultGame(), { type: "adjustBuyins", playerId: "p1", delta: 1 });
    expect(player(game, "p1")?.buyins).toBe(2);
    game = gameReducer(game, { type: "adjustBuyins", playerId: "p2", delta: -1 });
    game = gameReducer(game, { type: "adjustBuyins", playerId: "p2", delta: -1 });
    expect(player(game, "p2")?.buyins).toBe(0);
  });

  it("REQ-0001-10: sets a count, and clearing it removes the entry", () => {
    let game = gameReducer(defaultGame(), {
      type: "setPlayerChipCount",
      playerId: "p1",
      chipId: "red",
      count: 7,
    });
    expect(player(game, "p1")?.counts).toEqual({ red: 7 });
    game = gameReducer(game, {
      type: "setPlayerChipCount",
      playerId: "p1",
      chipId: "red",
      count: null,
    });
    expect(player(game, "p1")?.counts).toEqual({});
  });

  it("REQ-0001-16: applies photo counts to every chip row, missing colors as 0", () => {
    const game = gameReducer(defaultGame(), {
      type: "applyPhotoCounts",
      playerId: "p1",
      counts: { white: 4 },
    });
    expect(player(game, "p1")?.counts).toEqual({ white: 4, red: 0, blue: 0 });
  });

  it("REQ-0001-20: toggles spreading the difference", () => {
    expect(gameReducer(defaultGame(), { type: "setScale", scale: false }).scale).toBe(false);
  });

  it("REQ-0001-23: new game keeps names and chips, resets buy-ins and counts, opens Table", () => {
    let game = gameReducer(defaultGame(), { type: "setName", playerId: "p1", name: "Ana" });
    game = gameReducer(game, { type: "adjustBuyins", playerId: "p1", delta: 1 });
    game = gameReducer(game, {
      type: "setPlayerChipCount",
      playerId: "p1",
      chipId: "red",
      count: 3,
    });
    game = gameReducer(game, { type: "newGameSamePlayers" });
    expect(game.screen).toBe("table");
    expect(player(game, "p1")).toMatchObject({ name: "Ana", buyins: 1, counts: {} });
    expect(game.chips).toEqual(defaultGame().chips);
  });

  it("REQ-0001-24, -25: replaces the whole game", () => {
    const next = gameWith({ buyIn: 99 });
    expect(gameReducer(defaultGame(), { type: "replace", game: next })).toBe(next);
  });
});

describe("one value for all chips", () => {
  it("AC-0001-14: turning it on starts from the color rows' total chips and stack value", () => {
    const game = gameReducer(defaultGame(), { type: "setUniformValue", enabled: true });
    expect(game.uniformValue).toBe(true);
    expect(game.uniformChip).toEqual({ count: 40, value: 0.5 });
    expect(stackValue(game)).toBe(20);
    expect(stackChips(game)).toEqual([
      { id: UNIFORM_CHIP_ID, color: "mixed", count: 40, value: 0.5 },
    ]);
  });

  it("AC-0001-14: edits the single chip and leaves the color rows untouched", () => {
    let game = gameReducer(defaultGame(), { type: "setUniformValue", enabled: true });
    game = gameReducer(game, { type: "setUniformChipValue", value: 1 });
    game = gameReducer(game, { type: "setUniformChipCount", count: 30 });
    expect(stackValue(game)).toBe(30);
    game = gameReducer(game, { type: "setUniformValue", enabled: false });
    expect(game.chips.map((c) => c.value)).toEqual([0.25, 0.5, 1]);
    expect(stackValue(game)).toBe(20);
  });

  it("REQ-0001-28: uses a value of 0 when there are no chips to start from", () => {
    const game = gameWith({ chips: [{ id: "red", color: "red", count: 0, value: 1 }] });
    expect(gameReducer(game, { type: "setUniformValue", enabled: true }).uniformChip).toEqual({
      count: 0,
      value: 0,
    });
  });

  it("REQ-0001-28: photo counts add up into the single chip in one-value mode", () => {
    let game = gameReducer(defaultGame(), { type: "setUniformValue", enabled: true });
    game = gameReducer(game, {
      type: "applyPhotoCounts",
      playerId: "p1",
      counts: { white: 4, red: 3 },
    });
    expect(player(game, "p1")?.counts).toEqual({ [UNIFORM_CHIP_ID]: 7 });
  });
});
