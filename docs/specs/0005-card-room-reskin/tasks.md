# Tasks: SPEC-0005 Card Room — a new visual identity

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds. Spec §7 was resolved on 2026-11-05.

Legend: `[P]` can run in parallel with its neighbours.

## Setup

- [x] T-01 Palette and new tokens in `styles/tokens.css`, both themes _(REQ-0005-01, -04)_
  - Tests: `tokens.test.ts` pairs for text, controls, felt, brass text, step bars
  - Done when: `pnpm test` passes and no pair is below its threshold
- [x] T-02 Geist and Geist Mono via `next/font`; tabular figures for money _(REQ-0005-02)_
  - Tests: e2e computed font family (`test/e2e/card-room.spec.ts`)
  - Done when: `pnpm build` passes and `lib/security-headers.ts` is unchanged

## Core

- [x] T-03 [P] `initialOf` and `rankByNet` in `lib/` _(REQ-0005-06, -07)_
  - Tests: unit, including empty and lower-case names, ties, and zero nets
  - Done when: coverage for the module meets the thresholds
- [x] T-04 [P] Buttons and Table stepper shapes _(REQ-0005-14, -15)_
  - Tests: component class checks; existing button and stepper tests updated
  - Done when: AC-0005-12 holds
- [x] T-05 [P] Step bars, full and shrunk header, 44 px step buttons _(REQ-0005-12, -13)_
  - Tests: StepsNav component test; e2e compact height; forced-colors snapshot
  - Done when: AC-0005-10 and AC-0005-11 hold
- [x] T-06 [P] Single brass chip mark, `icon.svg`, `apple-icon.png` _(REQ-0005-11)_
  - Tests: icon source check (`source-checks.test.ts`); existing e2e icon route test
  - Done when: AC-0005-09 holds

## Screens

- [x] T-07 Table: felt pot panel first, avatars _(REQ-0005-03, -05, -06)_
  - Tests: component test for order and `aria-hidden`; axe
  - Done when: AC-0005-03 and AC-0005-04 hold
- [x] T-08 Settle: ranked rows, bars, short labels, balance line, payment avatars _(REQ-0005-07…-10)_
  - Tests: component tests for order, bar side and width, text for assistive technology, line shown and absent
  - Done when: AC-0005-05 to AC-0005-08 hold

## Verification and close

- [x] T-09 Check every step and both sheets in a browser: both themes, 320, 390 and 1280 px wide, top and scrolled _(AC-0005-13; the sheets through the macOS visual snapshots)_
- [x] T-10 `pnpm verify` and `pnpm test:a11y`; refresh visual baselines (macOS locally; Linux from the `update-visual-baselines` workflow)
- [x] T-11 Update the docs listed in the plan §7
- [x] T-13 Favicon.ico, manifest and its icons, theme colors, Open Graph image _(REQ-0005-16 … -19)_
  - Tests: `support.test.ts` (manifest, theme colors match tokens, large card); `source-checks.test.ts` (icon sizes, ICO frames); e2e `AC-0005-14 … -17`
  - Done when: every file is served with its type and the preview image is checked by eye
- [x] T-12 Set spec status to `implemented` and update `docs/specs/README.md`
