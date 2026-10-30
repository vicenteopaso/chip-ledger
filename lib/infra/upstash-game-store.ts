import { logError } from "@/lib/error-logging";
import {
  GAME_STORE_ERROR,
  parseStoredGame,
  PRESENCE_WINDOW_MS,
  type GameStore,
} from "@/lib/infra/game-store";
import { RECORD_TTL_SECONDS } from "@/lib/shared-game";

/**
 * The Redis adapter for shared games, over Upstash's REST interface (ADR-0005): one POST per
 * command, or one per pipeline. No SDK, so no new dependency. Every key starts with the
 * namespace (the deployment environment), and the code issues only single-key and prefixed
 * commands, never a bulk delete.
 */

type Command = readonly (string | number)[];
type Reply = { result?: unknown; error?: string };

/** Replaces the game only when the stored revision matches. 1 = written, 0 = lost the race. */
const COMPARE_AND_SET = `
local current = redis.call('GET', KEYS[1])
if not current then return 0 end
if cjson.decode(current).rev ~= tonumber(ARGV[1]) then return 0 end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
return 1`;

/** Records a heartbeat for an existing game in one step. */
const HEARTBEAT = `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[3])
redis.call('ZADD', KEYS[3], ARGV[1], ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', ARGV[4])
redis.call('EXPIRE', KEYS[3], ARGV[3])
return 1`;

export type UpstashOptions = {
  url: string;
  token: string;
  namespace: string;
  fetch?: typeof fetch;
};

export function createUpstashGameStore(options: UpstashOptions): GameStore {
  const { url, token, namespace } = options;
  const send = options.fetch ?? fetch;
  const key = (...parts: string[]) => [namespace, ...parts].join(":");

  /** Posts a body and returns the parsed JSON; any failure is logged without the credentials. */
  async function post(path: string, body: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await send(`${url}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch (error) {
      logError(error, { context: "upstash-game-store.request" });
      throw new Error(GAME_STORE_ERROR);
    }
    if (!response.ok) {
      logError(new Error(`Game store answered ${String(response.status)}`), {
        context: "upstash-game-store.request",
      });
      throw new Error(GAME_STORE_ERROR);
    }
    return response.json();
  }

  function unwrap(reply: Reply): unknown {
    if (reply.error) {
      logError(new Error(reply.error), { context: "upstash-game-store.command" });
      throw new Error(GAME_STORE_ERROR);
    }
    return reply.result;
  }

  const run = async (command: Command): Promise<unknown> =>
    unwrap((await post("", command)) as Reply);

  const pipeline = async (commands: Command[]): Promise<unknown[]> =>
    ((await post("/pipeline", commands)) as Reply[]).map(unwrap);

  const ttl = RECORD_TTL_SECONDS;

  return {
    async create(doc) {
      const result = await run(["SET", key("game", doc.id), JSON.stringify(doc), "EX", ttl, "NX"]);
      return result === "OK";
    },
    async get(id) {
      const result = await run(["GET", key("game", id)]);
      return parseStoredGame(typeof result === "string" ? result : null);
    },
    async compareAndSet(doc, expectedRev) {
      const result = await run([
        "EVAL",
        COMPARE_AND_SET,
        1,
        key("game", doc.id),
        expectedRev,
        JSON.stringify(doc),
        ttl,
      ]);
      return result === 1;
    },
    async heartbeat(id, connectionId, now) {
      await run([
        "EVAL",
        HEARTBEAT,
        3,
        key("game", id),
        key("seen", id),
        key("online", id),
        now,
        connectionId,
        ttl,
        now - PRESENCE_WINDOW_MS,
      ]);
    },
    async seenAt(id) {
      const result = await run(["GET", key("seen", id)]);
      return typeof result === "string" ? Number(result) : null;
    },
    async onlineCount(id, now) {
      const result = await run(["ZCOUNT", key("online", id), now - PRESENCE_WINDOW_MS, "+inf"]);
      return typeof result === "number" ? result : 0;
    },
    async remove(id) {
      await run(["DEL", key("game", id), key("seen", id), key("online", id)]);
    },
    async incr(name, windowMs) {
      const counter = key("count", name);
      const [count] = await pipeline([
        ["INCR", counter],
        ["PEXPIRE", counter, windowMs, "NX"],
      ]);
      return typeof count === "number" ? count : 0;
    },
    async setFlag(name, ttlMs) {
      await run(["SET", key("flag", name), "1", "PX", ttlMs]);
    },
    async hasFlag(name) {
      return (await run(["EXISTS", key("flag", name)])) === 1;
    },
  };
}
