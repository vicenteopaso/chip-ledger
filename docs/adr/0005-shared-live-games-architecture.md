# ADR-0005: Shared live games with a Redis store, capability links and server-sent events

|              |                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Proposed                                                                                                                        |
| **Date**     | 2026-10-30                                                                                                                      |
| **Deciders** | @vicenteopaso                                                                                                                   |
| **Area**     | architecture, security, data, hosting                                                                                           |
| **Related**  | [SPEC-0003](../specs/0003-shared-live-games/spec.md) · supersedes in part [ADR-0004](./0004-chip-ledger-client-architecture.md) |

## Context and problem statement

[ADR-0004](./0004-chip-ledger-client-architecture.md) kept every game on the device and rejected a server-backed app as "a product change nobody asked for". The owner now asks for that change: a host shares a running game with the people at the table, they see and, if allowed, edit it live, several games run at once, and idle games clean themselves up ([SPEC-0003](../specs/0003-shared-live-games/spec.md)).

That needs four things the app does not have: a place to keep a game outside one device, a way to tell watchers from editors without accounts, a way to push changes to open devices within about two seconds, and a retention rule for player names held on a server. The app runs on Vercel's serverless functions, which hold no memory between requests and are poorly suited to long-lived WebSockets. If we do nothing, the app stays single-device.

## Decision drivers

- No accounts or sign-in; access by link and code only (SPEC-0003 non-goals).
- Updates on other devices within 2 seconds for 95% of changes (REQ-0003-10).
- Reuse the pure reducer; one implementation of the game rules (CONSTITUTION-06).
- Serverless hosting; no process of ours that runs all the time.
- Names are personal data: short retention, deletion on request, nothing readable in logs (CONSTITUTION-09, -10, -11).
- Solo play must stay local, offline-capable and unchanged (REQ-0003-27).
- Small cost for a few games a month; no new npm packages for the store (dependencies are ask-first).
- Layer rules and the API conventions stay as they are (CONSTITUTION-04, -07).

## Considered options

1. **Redis (Upstash, over REST) with capability links and SSE** — game documents in Redis, secrets in the URL fragment, actions applied by the server, SSE with polling fallback.
2. **Managed realtime service (Ably, Pusher)** — the server still stores the game, but a hosted channel pushes changes to devices.
3. **SQL database with a realtime layer (for example Supabase)** — rows and subscriptions instead of documents.
4. **Peer-to-peer (WebRTC) between devices** — no server state; a tiny signalling endpoint only.
5. **Stay local** — keep ADR-0004 and share results as text only.

## Decision

**Chosen option:** "Option 1", because it fits serverless hosting, reuses `gameReducer` on the server, needs no new npm dependency for the store, and keeps data short-lived by construction (Redis TTLs).

Specifics:

- **Store.** Upstash Redis, provisioned through the Vercel Marketplace and called with `fetch` over its REST interface. One database for Production, one for Preview and Development. Credentials are server-only and read in `lib/infra/env.ts`. Without them, sharing is off and the API answers 404.
- **Access model.** Each game has a watch key and an edit key, 128 random bits each, carried in the URL fragment and sent as a bearer token. The server stores only SHA-256 hashes. A watcher becomes an editor by entering a six-character code that an editor shows; the code is salted, expires in 10 minutes and is replaced by the next one. Wrong codes are rate-limited per game.
- **Edits.** Clients send typed actions (the existing `GameAction` kinds minus `go`, `replace` and `newGameSamePlayers`, plus `startGame`). The server applies `gameReducer`, validates the result with the game schema and saves with compare-and-set on a revision. Buy-in changes are deltas, other fields are last-write-wins.
- **Updates.** Server-sent events with a reconnect cursor, closing before the platform limit; polling every 3 s as the fallback. A spike (SPEC-0003 T-03) measures duration, CPU and command use before the rest is built; its result may change this part to polling only without changing the rest of the design.
- **State changes to the app.** The current step becomes per-device state. The shared game gains a `started` flag. Solo games keep the `chip-ledger.v1` storage shape.
- **Lifecycle.** A game is archived after 24 hours with no change and no connected device, readable but not editable, and deleted by TTL 30 days later. Editors can delete earlier. No scheduled job.
- **Layers.** No new layer. Pure rules in `lib/`; the store, secrets, rate limiting and client in `lib/infra/`; handlers in `app/api/games/`; components in `app/components/`; hook and join page in the routes layer.
- **Headers.** No relaxation. `connect-src 'self'` already covers same-origin SSE and fetch. Game pages are `noindex`, excluded in `robots.ts`, and send no referrer.

### Consequences

**Positive**

- The app gains shared play without accounts, and the game rules still live in one tested reducer.
- Retention is enforced by the store's TTLs, not by code that could be forgotten.
- Turning the store variables off removes the feature without touching solo play.

**Negative**

- The app now holds user data (player names, money amounts) on a third-party service, and needs a privacy notice, a retention policy, and a store contract to keep up to date.
- Anyone holding an edit link or code can edit; there is no way to remove one editor, only to delete the game.
- Long-lived SSE connections may cost more function time than short requests; polling costs more Redis commands. Both are measured in the spike.
- A new hosted dependency adds a failure mode: when Redis is down, shared games stop and solo games continue.
- The per-instance rate limiter is not enough for the new routes, so they use a store-backed one, and the two limiters coexist until photo counting is enabled.

**Neutral / to monitor**

- Redis command count per game night and function duration per connected device.
- Whether editors need revocation after real use (non-goal for now).

## Validation

- The SPEC-0003 spike records duration, CPU and commands for 10 devices over 10 minutes and the result is added here before PR 2 merges.
- The two-browser e2e shows propagation within 2 seconds in at least 95 of 100 runs (AC-0003-09).
- The store contract test passes on both the in-memory and the Upstash adapters.
- After the first month in production, review command and duration usage against the plan limits, and the number of shared games and deletions.
- `pnpm verify`, axe in both themes, and a real-device check on a preview deployment (SPEC-0003 T-34).

## Pros and cons of the options

### Option 1: Redis over REST, capability links, SSE

- Good: fits serverless; no process of ours to keep alive; REST needs no new package.
- Good: the reducer runs on the server unchanged; TTLs enforce retention.
- Bad: first external service with user data; SSE on serverless needs measuring; polling fallback adds code.

### Option 2: Managed realtime service

- Good: instant push without our own streaming endpoint.
- Bad: a second external service and second set of secrets; the game still needs a store; vendor lock-in on channel semantics.

### Option 3: SQL database with realtime

- Good: durable, queryable, built-in subscriptions.
- Bad: heavier than a few kilobytes per game warrants; schema migrations; subscriptions need client credentials or a proxy; retention needs a scheduled job.

### Option 4: Peer-to-peer

- Good: no game data on a server.
- Bad: needs everyone online at once, fails behind many networks without relay servers, no way to join late or reopen a finished game, and no archive.

### Option 5: Stay local

- Good: no new risk.
- Bad: does not meet the request.

## Follow-ups

- [ ] Run the SPEC-0003 spike (T-03) and record the result in Validation
- [ ] Update `sdd.yaml`: `security.external-services` (Upstash and what it receives), the stateless-handler note
- [ ] Update ADR-0004's status to "Accepted; superseded in part by ADR-0005"
- [ ] Update reference docs: Architecture, Security Policy, API Patterns, Configuration, Error Handling, Accessibility
- [ ] Decide on adopting `OPT-PRIVACY` in the Constitution (separate amendment)
- [ ] Revisit editor revocation and in-app QR scanning after real use

## References

- [SPEC-0003](../specs/0003-shared-live-games/spec.md) · [plan](../specs/0003-shared-live-games/plan.md)
- [ADR-0004](./0004-chip-ledger-client-architecture.md) · [API Patterns](../API_PATTERNS.md) · [Security Policy](../SECURITY_POLICY.md)
- Vercel documentation: adding Upstash Redis from the Marketplace (`vercel integration add upstash/upstash-kv`)
