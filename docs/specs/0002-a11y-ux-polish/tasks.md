# Tasks: SPEC-0002 Accessibility, UX, and consistency pass

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds.

Legend: `[P]` can run in parallel with its neighbours.

## Setup

- [x] T-01 Resolve the open questions in spec §7 and set the spec to `approved`.
  - Done when: no `[NEEDS CLARIFICATION]` markers remain.
- [x] T-02 Capture "before" evidence: screenshots of findings 1, 2, 4, 9, and 10 (plan §1) in light and dark at 375 px and 1280 px.
  - Done when: the screenshots are attached to the first implementation PR.
- [x] T-03 Add tokens: hover, disabled, recalculated step-done, and size tokens for the one-offs _(REQ-0002-04, -17, -18, -26)_
  - Tests: unit contrast check over `tokens.css` pairs in both themes
  - Done when: every new pair is ≥ its WCAG minimum and is listed in `DESIGN_SYSTEM.md`.

## Phase 1: accessibility (P1)

- [x] T-04 Focus and title on step change _(REQ-0002-02)_
  - Tests: component test on `ChipLedgerApp`; e2e: Enter on "Start the game" → focus on the `h1`, Tab → step nav
  - Done when: AC-0002-02 passes and focus is not moved on first load.
- [x] T-05 [P] Visible color names in count cells _(REQ-0002-01)_
  - Tests: PlayerCashCard component test; e2e `enterCounts` unchanged
  - Done when: AC-0002-01 passes; screenshot under a deuteranopia simulation attached.
- [x] T-06 [P] Photo control name _(REQ-0002-03)_
  - Tests: component test for the three states
  - Done when: AC-0002-03 passes.
- [x] T-07 [P] Step done state: check mark and "(done)" _(REQ-0002-04)_
  - Tests: StepsNav component test; visual
  - Done when: AC-0002-04 passes.
- [x] T-08 Visible labels on Setup _(REQ-0002-05)_
  - Tests: component tests; update e2e helpers; visual at 320 px
  - Done when: AC-0002-05 passes and Setup reflows at 320 px and 200% zoom.
- [x] T-09 [P] Copy-fallback field border _(REQ-0002-06)_
  - Tests: component test
  - Done when: AC-0002-06 passes.
- [ ] T-10 LiveAnnouncer and announcements _(REQ-0002-07)_
  - Tests: component tests for each message and the debounce by kind
  - Done when: AC-0002-07 passes; a VoiceOver or NVDA check is recorded in the PR.
- [x] T-11 `aria-disabled` start button _(REQ-0002-08)_
  - Tests: Button and SetupScreen component tests; e2e cleared buy-in
  - Done when: AC-0002-08 passes.
- [x] T-12 [P] Forced-colors support _(REQ-0002-09)_
  - Tests: visual snapshots with `forcedColors: "active"`
  - Done when: AC-0002-09 passes.
- [x] T-13 Bottom bar never hides focus _(REQ-0002-10)_
  - Tests: e2e at 375 × 812 and 375 × 400
  - Done when: AC-0002-10 passes.

- [ ] T-13a Close Phase 1: refresh visual baselines (macOS and Linux), run `pnpm verify`, `pnpm test:a11y`, `pnpm test:visual`, and open the P1 PR.
  - Done when: all pass and the PR has before/after screenshots in both themes at mobile and desktop widths.

## Phase 2: experience (P2)

- [ ] T-14 `ConfirmInline` and the new reset flow _(REQ-0002-11)_
  - Tests: component tests (focus, Esc, Cancel, confirm); e2e replacing AC-0001-10
  - Done when: AC-0002-11 passes; REQ-0001-24 points to REQ-0002-11.
- [ ] T-15 Settle bar actions _(REQ-0002-12)_
  - Tests: component test; e2e new-game flow
  - Done when: AC-0002-12 passes; REQ-0001-02 points to REQ-0002-12.
- [ ] T-16 [P] Visible short/over text _(REQ-0002-14)_
  - Tests: unit `countCheckRows`; component
  - Done when: AC-0002-14 passes.
- [ ] T-17 [P] Copy without "Tap" _(REQ-0002-15)_
  - Tests: unit search over copy
  - Done when: AC-0002-15 passes.
- [ ] T-18 Type sizes, hover, disabled tokens applied _(REQ-0002-16, -17, -18)_
  - Tests: visual; e2e hover in the desktop project
  - Done when: AC-0002-16, -17, -18 pass.

- [ ] T-18a Close Phase 2: refresh visual baselines and open the P2 PR, with the same checks as T-13a.
  - Done when: as T-13a.

## Phase 3: consistency (P3)

- [ ] T-19 `Stepper` used by Setup and Table; − disabled at 0 _(REQ-0002-19, -13)_
  - Tests: Stepper component tests; e2e AC-0001-04 and AC-0001-17 still pass
  - Done when: AC-0002-13 and AC-0002-19 pass.
- [ ] T-20 [P] `Card` and `ListRow` _(REQ-0002-20)_
  - Tests: component tests; visual
  - Done when: Cash out cards and payments share `Card`; chip rows, Table rows, and results share `ListRow`.
- [ ] T-21 [P] `outline` button and photo control _(REQ-0002-21)_
  - Tests: Button component test
  - Done when: the photo control uses the variant's classes.
- [ ] T-22 [P] One focus style _(REQ-0002-22)_
  - Tests: static check
  - Done when: AC-0002-20 passes.
- [ ] T-23 [P] Notice icon and box for every kind _(REQ-0002-23)_
  - Tests: Notice component test; visual
  - Done when: AC-0002-19 covers Notice.
- [ ] T-24 Headings, brand line, error and 404 pages _(REQ-0002-24)_
  - Tests: component tests; e2e `openFresh` heading updated
  - Done when: AC-0002-21 passes.
- [ ] T-25 Bottom-bar naming rule _(REQ-0002-25)_
  - Tests: component test; e2e helpers
  - Done when: AC-0002-22 passes.
- [ ] T-26 Remove one-off sizes _(REQ-0002-26)_
  - Tests: static check
  - Done when: AC-0002-23 passes.

## Verification and close

- [ ] T-27 Docs: component docs for the new components, updated `DESIGN_SYSTEM.md` (tokens, contrast table, patterns) and `ACCESSIBILITY.md` (remove the known hidden-label gap), and SPEC-0001 cross-references.
  - Done when: `node scripts/check-sdd-refs.mjs && node scripts/check-doc-links.mjs` pass.
- [ ] T-28 Close Phase 3: refresh visual baselines (macOS and Linux), open the P3 PR, and run `pnpm verify`, `pnpm test:a11y`, `pnpm test:visual`.
  - Done when: all pass; AC-0002-24 is demonstrated with a keyboard walkthrough and a screen-reader pass noted in the PR.
- [ ] T-29 Set the spec to `implemented`, update the index, and remove Roadmap item 1.
