import { describe } from "vitest";

import { createUpstashGameStore } from "@/lib/infra/upstash-game-store";
import { runGameStoreContract } from "@/test/unit/lib/infra/game-store-contract";

/**
 * Runs the store contract against a real Upstash database (SPEC-0003 T-08). Off by default so CI
 * needs no credentials and never touches shared data. To run it by hand:
 *
 *   RUN_STORE_CONTRACT=1 KV_REST_API_URL=… KV_REST_API_TOKEN=… pnpm test game-store.live
 *
 * Every key is written under a throwaway `contract-…` namespace and the tests remove their games.
 */
const url = process.env.KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN;
const live = process.env.RUN_STORE_CONTRACT === "1" && Boolean(url) && Boolean(token);

if (live && url && token) {
  runGameStoreContract("upstash (live)", () => ({
    store: createUpstashGameStore({
      url,
      token,
      namespace: `contract-${String(Date.now())}`,
    }),
  }));
} else {
  describe.skip("game store contract: upstash (live, set RUN_STORE_CONTRACT=1)", () => undefined);
}
