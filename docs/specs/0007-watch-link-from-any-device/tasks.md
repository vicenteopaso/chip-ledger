# Tasks: SPEC-0007 Watch link from any device in the game

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds.

Legend: `[P]` can run in parallel with its neighbours.

## Core

- [ ] T-01 `shareLink` adds `&w=` to edit links; `keysFromHash` reads both forms _(REQ-0007-01, -03, -04)_
  - Tests: unit for both link kinds, malformed `w`, `w = k`, extra parameters
  - Done when: unit tests pass and `pnpm typecheck` is clean
- [ ] T-02 Save the watch key when a link carries one; offer it in the edit link _(REQ-0007-01, -04)_
  - Tests: SharedGameApp component test (storage holds both keys); ShareControl shows both kinds for an edit-link joiner
  - Done when: AC-0007-01 and AC-0007-02 pass in e2e
- [ ] T-03 [P] Older-link explanation in the Share sheet _(REQ-0007-05, -07)_
  - Tests: component test for the text; no "started sharing" text for any editor with a watch key
  - Done when: AC-0007-06 and AC-0007-08 pass, axe passes in both themes
- [ ] T-04 [P] Safari sentence in the notice before the first share _(REQ-0007-09)_
  - Tests: unit for the text; component test with `navigator.standalone` true, false and absent
  - Done when: AC-0007-09 passes in e2e with `navigator.standalone` stubbed by an init script (the suite runs Chromium only)

## Verification and close

- [ ] T-05 E2E: a watch link from a guest's phone can't edit, ask for a code or delete; revision unchanged after showing links _(AC-0007-03, -04, -07)_
- [ ] T-06 Log and store scan after a session, extending the SPEC-0003 check _(AC-0007-05)_
- [ ] T-07 QR check: the edit QR fits at 320 px and scans on two phones (photos in the PR)
- [ ] T-08 Update the docs listed in the plan §7
- [ ] T-09 `pnpm verify` passes
- [ ] T-10 Set spec status to `implemented` and update `docs/specs/README.md`
