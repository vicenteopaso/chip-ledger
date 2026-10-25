# Tasks: SPEC-0001 Chip Ledger

Ordered, small, independently verifiable. Check a box only when the done-condition holds.

## Setup

- [x] T-01 Scaffold tooling: Next.js, TypeScript strict, Tailwind, ESLint (layers, a11y), Prettier, Vitest, Playwright _(all)_
  - Done when: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` run on an empty page

## Core (domain)

- [x] T-02 Game schema, defaults, selectors, and reducer _(REQ-0001-01 … -11, -23 … -26)_
  - Tests: `test/unit/lib/game.test.ts`, `test/unit/lib/game-reducer.test.ts`
- [x] T-03 Money formatting and input parsing _(REQ-0001-04, -10)_
  - Tests: `test/unit/lib/money.test.ts`
- [x] T-04 Setup summary and count check _(REQ-0001-06, -12)_
  - Tests: `test/unit/lib/setup-summary.test.ts`, `test/unit/lib/count-check.test.ts`
- [x] T-05 Settlement and results text _(REQ-0001-18 … -22)_
  - Tests: `test/unit/lib/settlement.test.ts`, `test/unit/lib/results-text.test.ts`
- [x] T-06 Photo prompt, reply schema, messages _(REQ-0001-14 … -16)_
  - Tests: `test/unit/lib/photo-count.test.ts`

## Infra

- [x] T-07 Storage, clipboard, photo-count client, vision client, rate limiter, env; error logging _(REQ-0001-13, -15, -17, -22, -25, -26)_
  - Tests: `test/unit/lib/infra/*.test.ts`, `test/unit/lib/error-logging.test.ts`
- [x] T-07b `POST /api/photo-count` route handler _(REQ-0001-13, -15, -17)_
  - Tests: `test/unit/app/api/photo-count.test.ts` — off (404), cross-origin (403), rate-limited (429), invalid (400), upstream failure (500 + one log), success

## UI and wiring

- [x] T-08 Tokens and Tailwind theme matching the prototype _(REQ-0001-27)_
- [x] T-09 Screens and shared components _(REQ-0001-01 … -24)_
  - Tests: `test/unit/app/components/*.test.tsx`
- [x] T-10 Container, layout, SEO, error pages, security headers _(REQ-0001-02, -13 … -17, -25)_
  - Tests: `test/unit/app/ChipLedgerApp.test.tsx`

## Verification and close

- [x] T-11 E2E flows, a11y (both themes), visual (both themes × mobile/desktop) _(AC-0001-01 … -13)_
- [x] T-12 Side-by-side check against the prototype, both themes, both widths
- [x] T-13 Update docs, `sdd.yaml`, `.env.example`, component docs; specs index
- [x] T-15 One value for all chips _(REQ-0001-28, AC-0001-14)_
  - Tests: reducer, schema default, SetupScreen, e2e; visual baselines refreshed
- [x] T-16 Auto-balanced chips and currency support _(REQ-0001-29, -30, AC-0001-15, -16)_
  - Tests: planner, money, reducer, settlement in whole units, Setup, e2e
- [x] T-17 EUR 10 default, Settle "Back to Setup", pot as plain text _(REQ-0001-02, -09, -26)_
- [x] T-18 Player count 2–10 with a − / + stepper _(REQ-0001-03, AC-0001-17)_
- [x] T-14 Set spec status to `implemented`
