import { expect, type APIRequestContext, type Page } from "@playwright/test";

import { createGame } from "@/lib/game";
import { sequentialIds } from "@/lib/ids";

export type Shared = { id: string; watchKey: string; editKey: string };

/** A client address of its own, so tests do not share the server's per-client limits. */
export function uniqueClient(): string {
  const n = () => String(Math.floor(Math.random() * 250) + 1);
  return `203.${n()}.${n()}.${n()}`;
}

/** Makes the page and its requests look like one device (the limits are per client). */
export async function asDevice(page: Page, address = uniqueClient()) {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": address });
}

/** Shares a fresh game through the API, as the Share button will (PR 5). */
export async function shareGame(
  request: APIRequestContext,
  baseURL: string,
  { started = true }: { started?: boolean } = {},
): Promise<Shared> {
  const response = await request.post("/api/games", {
    headers: { origin: baseURL, "x-forwarded-for": uniqueClient() },
    data: { started, game: createGame(sequentialIds("e")) },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as Shared;
}

/** Sends one edit as an editor would (PR 4 does this from the page). */
export async function editGame(
  request: APIRequestContext,
  baseURL: string,
  shared: Shared,
  action: Record<string, unknown>,
  key = shared.editKey,
) {
  return request.post(`/api/games/${shared.id}/actions`, {
    headers: {
      origin: baseURL,
      authorization: `Bearer ${key}`,
      "x-forwarded-for": uniqueClient(),
    },
    data: { actionId: crypto.randomUUID(), baseRev: 0, queuedMs: 0, action },
  });
}

/** Opens a shared game the way a scanned link does. */
export async function openShared(page: Page, id: string, key: string) {
  await asDevice(page);
  await page.goto(`/g/${id}#k=${key}`);
}

/** Opens a game the way the host's device does after "Create the link": both keys saved, sheet asked for. */
export async function openAsHost(page: Page, shared: Shared) {
  await asDevice(page);
  await page.addInitScript(
    ({ id, editKey, watchKey }) => {
      localStorage.setItem(
        "chip-ledger.joined.v1",
        JSON.stringify([{ id, key: editKey, watchKey }]),
      );
    },
    { id: shared.id, editKey: shared.editKey, watchKey: shared.watchKey },
  );
  await page.goto(`/g/${shared.id}?share=1`);
}

/** A device that already holds these games, as after sharing or joining them (both keys saved). */
export async function holdGames(page: Page, games: Shared[]) {
  await asDevice(page);
  await page.addInitScript((list) => {
    // Only the first time: later page loads keep what the app saved (names, steps).
    if (localStorage.getItem("chip-ledger.joined.v1")) return;
    localStorage.setItem(
      "chip-ledger.joined.v1",
      JSON.stringify(list.map((g) => ({ id: g.id, key: g.editKey, watchKey: g.watchKey }))),
    );
  }, games);
}
