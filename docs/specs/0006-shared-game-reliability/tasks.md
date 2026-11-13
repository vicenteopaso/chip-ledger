# Tasks: SPEC-0006 Shared games that stay shared

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds.

Legend: `[P]` can run in parallel with its neighbours.

## Read limits (cause 2)

- [ ] T-01 Key the read limiter by address and game, add the per-address cap, log refusals _(REQ-0006-08, -09, -12)_
  - Tests: unit for both limiters; route test: 12 clients × 30 reads a minute from one address pass, the per-address cap refuses across games, the log has route and limit only
  - Done when: route tests pass and no log line contains the address, key or id
- [ ] T-02 Read `Retry-After` and wait it out; busy never shows Offline _(REQ-0006-10, -11)_
  - Tests: client parses and clamps the header; hook test: no check before `notBefore`, including after a visibility change; status stays Reconnecting
  - Done when: hook tests pass with fake timers

## Reopening the right game (cause 1)

- [ ] T-03 [P] Add `lib/infra/last-game-storage.ts` _(REQ-0006-01)_
  - Tests: unit for round trip, bad JSON, failed validation, storage that throws
  - Done when: coverage for the module meets the threshold
- [ ] T-04 Redirect from `/` to the last shared game; record "own" otherwise; Games "own game" records it _(REQ-0006-01, -03, -04)_
  - Tests: component tests for redirect, no redirect without a key, no fetch for an own game
  - Done when: AC-0006-02 and AC-0006-04 pass in e2e
- [ ] T-05 Shared page: record "shared", handle `resume=1` fallback for archived and unavailable games _(REQ-0006-02)_
  - Tests: component tests for 404 and archived with and without `resume`; loop test
  - Done when: AC-0006-01 and AC-0006-03 pass in e2e
- [ ] T-06 Clear the device's own game after sharing; add the notice sentence _(REQ-0006-05, -06, -07)_
  - Tests: ShareControl calls `onShared` only on `created`; notice text unit; Games list shows one entry with the title
  - Done when: AC-0006-05 and AC-0006-06 pass in e2e, and axe passes on the Share sheet in both themes

## Wording (cause 3)

- [ ] T-07 [P] "N phones live" and the "not counted" note _(REQ-0006-13, -14)_
  - Tests: `statusText` unit (0, 1, many, with pending); ConnectionStatus component; visual baselines for the status row
  - Done when: AC-0006-11 passes, axe passes in both themes at 320 px

## Verification and close

- [ ] T-08 E2E for staying in the game: host shares again, a guest's tab is hidden 10 minutes (fake clock), another goes offline and back _(AC-0006-12, REQ-0006-15)_
- [ ] T-09 Real-phone check on a preview: installed app reopens the shared game; 3+ phones on one Wi-Fi stay Live for 10 minutes (screenshots in the PR)
- [ ] T-10 Update the docs listed in the plan §7
- [ ] T-11 `pnpm verify` passes
- [ ] T-12 Set spec status to `implemented` and update `docs/specs/README.md`
