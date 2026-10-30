# Tasks: SPEC-0003 Shared live games

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds. Nothing here starts until the owner approves the plan and ADR-0005 (Tier 2).

Legend: `[P]` can run in parallel with its neighbours. Each numbered group ships as one PR (plan §6).

## 0. Before code

- [x] T-01 Owner approves plan.md and ADR-0005, then sets ADR-0005 to `accepted`.
  - Done when: both are merged to `main`. (Approved by the owner on 2026-10-30; merge with PR #9.)
- [x] T-02 Owner provisions the Upstash database and connects it to the Vercel project (plan §6), and tells the agent the variable names (never the values).
  - Done when: the variables exist in Production and, scoped to the feature branch, in Preview, and the names are written into `docs/CONFIGURATION.md` by T-04. (Done 2026-10-30: one database, because the free plan allows one; names `KV_REST_API_URL` and `KV_REST_API_TOKEN`.)
- [ ] T-03 Spike: a throwaway route holds an SSE connection that reads a Redis key every 1–3 s, with 10 simulated clients for 10 minutes, on a Vercel preview.
  - Tests: none (measurement); results go into ADR-0005 under Validation
  - Done when: function duration, CPU time and Redis command counts per client-hour are recorded, and the decision "SSE or polling only" is written into the plan. The spike code is not merged.

## 1. Domain and store (PR 1, no UI)

- [x] T-04 Store configuration: `getGameStoreConfig` in `lib/infra/env.ts` (reads `KV_REST_API_URL`, `KV_REST_API_TOKEN` and `VERCEL_ENV` for the key prefix), `.env.example`, `docs/CONFIGURATION.md` _(REQ-0003-01, -27)_
  - Tests: unit for present, partial and absent variables; partial fails naming the variable; the environment prefix is applied to every key and defaults to a safe value outside Vercel
  - Done when: sharing reports "off" with no variables and a clear error with half of them.
- [x] T-05 Shared games leave out `screen`; add `started` and `startGame` _(REQ-0003-15)_
  - Tests: unit for the shared body, `startGame`, and the saved-game rules reused for shared games
  - Done when: solo play is unchanged and all existing tests pass. Solo `GameState` keeps its `screen` until the UI PRs (PR 3 and 4) hold the step per device; the shared body is already `GameState` minus `screen`.
- [x] T-06 `lib/shared-game.ts`: schemas, allowed actions, apply-and-validate, idempotency, size caps, lifecycle _(REQ-0003-10, -11, -19 to -21, -23)_
  - Tests: unit including `replace`, `go` and unknown kinds rejected; buy-in deltas add; replay of a known `actionId` is a no-op; lifecycle with a fake clock
  - Done when: coverage for the module meets the threshold.
- [x] T-07 `lib/infra/secrets.ts`: key and code generation, hashing, constant-time compare _(REQ-0003-04, -08, -24)_
  - Tests: unit for entropy length, alphabet, expiry, replacement, lockout counter
  - Done when: no function returns or logs a stored hash's input.
- [x] T-08 `lib/infra/game-store.ts`: interface, in-memory adapter, Upstash REST adapter with compare-and-set, heartbeat, presence and TTL _(REQ-0003-10, -19, -21)_
  - Tests: one contract test run against the in-memory adapter in CI and against Upstash by a manual script
  - Done when: both adapters pass the contract test.
- [x] T-09 `lib/infra/store-rate-limit.ts` _(REQ-0003-09, -25)_
  - Tests: unit with the in-memory store: windows, lockout, per-game and per-client keys
  - Done when: limits hold across two simulated instances sharing one store.
- [x] T-10 Close PR 1: `pnpm verify` green; ADR-0004 status line updated.

## 2. API routes (PR 2)

- [ ] T-11 `POST /api/games` and `GET /api/games/{id}` _(REQ-0003-04, -05, -23, -25, -26)_
  - Tests: route tests for success, bad body, oversize, rate limit, wrong key, unknown id (identical 404)
  - Done when: error bodies are generic with a request ID and details go to the server log.
- [ ] T-12 `POST /api/games/{id}/actions` _(REQ-0003-06, -07, -10, -11, -23)_
  - Tests: editor accepted; watcher 403-equivalent; stale `baseRev` merged or retried; forged kinds rejected
  - Done when: AC-0003-05, -06 and -18 pass at route level.
- [ ] T-13 `POST /api/games/{id}/code`, `POST /api/games/{id}/upgrade`, `DELETE /api/games/{id}` _(REQ-0003-08, -09, -21)_
  - Tests: route tests for expiry, replacement, lockout, delete
  - Done when: AC-0003-07, -08 and -16 pass at route level.
- [ ] T-14 `GET /api/games/{id}/events` (SSE) _(REQ-0003-10, -13)_
  - Tests: route test for the first snapshot, change events, heartbeat and the reconnect cursor
  - Done when: the connection closes by itself before the platform limit and a reconnect loses no revision.
- [ ] T-15 Close PR 2: `pnpm verify` green; no secrets or keys in logs (AC-0003-19).

## 3. Join and watch (PR 3)

- [ ] T-16 `app/g/[id]/page.tsx`: `noindex`, no referrer, `robots.ts` disallow, generic unavailable page _(REQ-0003-04, -05, -26, SEO)_
  - Tests: component and e2e; AC-0003-03, -04 and -21
  - Done when: the key never appears in a request URL and wrong key and deleted game look identical.
- [ ] T-17 `useSharedGame` hook (snapshot, SSE, polling fallback, status) and `ConnectionStatus` _(REQ-0003-10, -13, -14)_
  - Tests: hook tests with a fake server; component states; axe
  - Done when: AC-0003-09 passes in e2e and the status is announced.
- [ ] T-18 [P] `WatchOnlyNotice`, disabled editing controls for watchers _(REQ-0003-06)_
  - Tests: component and e2e; AC-0003-05
  - Done when: controls are inoperable and the role is stated in text.
- [ ] T-19 [P] Waiting-for-host state _(REQ-0003-15)_
  - Tests: e2e AC-0003-12
  - Done when: the watcher follows the start without reloading.
- [ ] T-20 Close PR 3: refresh visual baselines for new states (both themes, mobile and desktop, forced colors); `pnpm verify`, `pnpm test:a11y`, `pnpm test:visual`.

## 4. Editing and sync (PR 4)

- [ ] T-21 Optimistic actions, pending queue, reconcile on snapshot _(REQ-0003-10, -11, -14)_
  - Tests: unit for reconcile order; e2e AC-0003-06 and AC-0003-11
  - Done when: two editors pressing + together end at +2 and a network cut recovers by itself.
- [ ] T-22 Do not overwrite a focused field; extend `DraftInput` _(REQ-0003-12)_
  - Tests: component and e2e AC-0003-10
  - Done when: typed text, caret and focus survive remote updates.
- [ ] T-23 Remote-change announcements, grouped _(REQ-0003-29)_
  - Tests: unit for sentences and grouping; component with `LiveAnnouncer`; AC-0003-23
  - Done when: one remote + gives exactly one announcement.
- [ ] T-24 Close PR 4: `pnpm verify`, `pnpm test:a11y`, `pnpm test:visual`.

## 5. Share sheet, QR and upgrade (PR 5)

- [ ] T-25 Add the QR encoder dependency, chosen and justified in the PR description (license, size, no dependencies, release age) _(REQ-0003-02)_
  - Tests: unit that a known link produces the expected module matrix
  - Done when: the owner approved the package in the PR (dependencies are ask-first).
- [ ] T-26 `QrCode` component (inline SVG, text alternative) _(REQ-0003-28)_
  - Tests: component; axe in both themes; forced colors
  - Done when: contrast of dark modules on light background holds in the dark theme too.
- [ ] T-27 `ShareSheet`: dialog, focus handling, copy, native share, retention notice, switch last _(REQ-0003-02, -03, -22, -28)_
  - Tests: component and e2e AC-0003-02, -17 and -22; keyboard-only run
  - Done when: AC-0003-02, -17 and -22 pass and the sheet works at 320 px and 200% zoom.
- [ ] T-28 Edit-code block and the upgrade form for watchers _(REQ-0003-08, -09)_
  - Tests: component and e2e AC-0003-07 and -08
  - Done when: old, expired and wrong codes fail with the same message.
- [ ] T-29 Close PR 5: visual baselines; `pnpm verify`, `pnpm test:a11y`, `pnpm test:visual`.

## 6. Several games and lifecycle (PR 6)

- [ ] T-30 `joined-games-storage` and `GamesList`: switch, leave _(REQ-0003-17, -18)_
  - Tests: unit for storage with invalid data; component; e2e AC-0003-14
  - Done when: leaving removes access from this device only.
- [ ] T-31 Fork on new game and reset in shared games; solo behaviour unchanged _(REQ-0003-16)_
  - Tests: unit; e2e AC-0003-13
  - Done when: the second device still shows the original game, and the REQ-0001-24 and REQ-0002-11, -12 pointers are in place.
- [ ] T-32 Archived state, **Duplicate into a new game**, delete with `ConfirmInline` _(REQ-0003-19 to -21)_
  - Tests: component; e2e with a test clock hook; AC-0003-15 and -16
  - Done when: an open device keeps a game from archiving.
- [ ] T-33 Close PR 6: visual baselines; `pnpm verify`, `pnpm test:a11y`, `pnpm test:visual`.

## 7. Verification and close

- [ ] T-34 Real-device check on a Vercel preview: three phones, one QR, edits both ways, airplane-mode test, screen-reader pass on a watcher; notes and screenshots in the PR _(AC-0003-24)_
- [ ] T-35 Docs, `sdd.yaml`, `.env.example` as listed in plan §7; `node scripts/check-sdd-refs.mjs && node scripts/check-doc-links.mjs`
- [ ] T-36 Set the spec to `implemented`, ADR-0005 to its final status, and update `docs/specs/README.md`
- [ ] T-37 File follow-up issues for anything deferred (editor revocation, in-app QR scanning, history)
