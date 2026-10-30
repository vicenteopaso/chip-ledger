# Tasks: SPEC-0004 Money in per player, and chip sales between players

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds. Nothing here starts until the owner approves the plan and ADR-0006 (Tier 2).

Legend: `[P]` can run in parallel with its neighbours. The whole feature ships as one PR (plan §6); tasks are in build order.

## 1. Domain

- [x] T-01 `Player.moved` (default 0), `moneyIn(game, player)`, `pot` as the sum of money in _(REQ-0004-02, -06, -10)_
  - Tests: unit for old saved games (no `moved`), a game with sales, and the pot after a buy-in step
  - Done when: existing tests pass unchanged and `pnpm typecheck` is clean
- [x] T-02 `sellChips` in the reducer; `setPlayerCount` refusal; `newGameSamePlayers` clears `moved` _(REQ-0004-03, -04, -13)_
  - Tests: unit for a sale, a negative result, same player, amount ≤ 0, inactive players, refused count change, new game
  - Done when: the sum of `moved` over active players is 0 after every sale in a property-style test
- [x] T-03 Settlement uses money in and reports whether sales were included _(REQ-0004-05)_
  - Tests: unit with and without sales; difference and payments unchanged when `moved` is all zero
  - Done when: AC-0004-04 passes at unit level
- [x] T-04 Shared games: `sellChips` in `SharedActionSchema`; `moved` in the shared body; queue coalescing; remote-change announcement _(REQ-0004-08, -12)_
  - Tests: unit for schema accept/reject, queue (never coalesced), `remoteChanges` wording, old stored body parses
  - Done when: AC-0004-06 and -11 pass at unit and route level

## 2. Interface

- [x] T-05 `SellChips` inline form: seller, buyer, amount, errors in text, focus, announcement _(REQ-0004-03, -11)_
  - Tests: component (role and label queries, keyboard, refusal text, focus return)
  - Done when: keyboard-only walkthrough works
- [x] T-06 `TableScreen`: amount first, buy-ins small, net sale line, "Sell chips" button; read-only for watchers _(REQ-0004-01, -07, -09)_
  - Tests: component for solo, editor, watcher
  - Done when: AC-0004-01, -05 and -08 pass
- [x] T-07 `SettleScreen`: "Includes chip sales" note _(REQ-0004-05)_
  - Tests: component
  - Done when: the note appears only when a net sale amount is not zero
- [x] T-08 Player-count refusal message in Setup _(REQ-0004-13)_
  - Tests: component and AC-0004-10

## 3. Verification and close

- [x] T-09 E2E: solo sale and settle; two devices; saved game reload; watcher _(AC-0004-02, -04, -06, -07, -08)_
- [ ] T-10 Visual baselines (Linux via the `update-visual-baselines` label) and axe in both themes, mobile and desktop; real-browser screenshots in the PR
- [x] T-11 Docs as listed in the plan; `node scripts/check-sdd-refs.mjs && node scripts/check-doc-links.mjs`
- [ ] T-12 Set the spec to `implemented`, ADR-0006 to its final status, and update both indexes
