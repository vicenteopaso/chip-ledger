# Plan: SPEC-0002 Accessibility, UX, and consistency pass

| Field  | Value                |
| ------ | -------------------- |
| Spec   | [spec.md](./spec.md) |
| ADR    | none (Tier 1)        |
| Status | draft                |

## 1. Approach

The work is all in the UI layer and the tokens, done in three phases that can ship as separate PRs: **P1 accessibility** (REQ-0002-01 … -10), **P2 experience** (-11 … -18), and **P3 consistency** (-19 … -26). New shared components (`Stepper`, `Card`, `ListRow`, `ConfirmInline`) come first in P3's order where P1 or P2 needs them, so no pattern is built twice.

No new dependency, layer, data model, storage key, API, or security header is involved, so no ADR is needed (Tier 1). `ChipLedgerApp.tsx` (routes layer) gains a focus-and-title effect and the reset-confirmation state. It already owns `resetArmed`, so this is a rename, not a new concern.

### Audit findings → requirements

Found in the manual audit of 2026-10-30, by reading every component and checking contrast with WCAG formulas.

| #   | Finding (current code)                                                                                                             | WCAG / heuristic                   | Requirement |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------- |
| 1   | `PlayerCashCard`: count cells show only chip art; the color name is only in `aria-label`                                           | 1.4.1                              | REQ-0002-01 |
| 2   | Bottom-bar buttons unmount on step change, so focus falls to `<body>`; `document.title` is static                                  | 2.4.3, 2.4.2, 4.1.3                | REQ-0002-02 |
| 3   | Photo `<label>` reads "Retake photo" while the input's `aria-label` is "Take a photo of …"                                         | 2.5.3                              | REQ-0002-03 |
| 4   | `--color-step-done` ≈ 2.5:1 on `bg` (light); done state not exposed to AT                                                          | 1.4.11, 1.3.1                      | REQ-0002-04 |
| 5   | `sr-only` labels on names, buy-in, currency, chip fields; every row's select is "Chip color"                                       | 3.3.2, 2.4.6                       | REQ-0002-05 |
| 6   | Copy-fallback `<textarea>` uses `border-border` (≈ 1.2:1)                                                                          | 1.4.11                             | REQ-0002-06 |
| 7   | Player count live region says only "5"; "Copied" and reset arming are not announced; Setup summary re-announces on every keystroke | 4.1.3                              | REQ-0002-07 |
| 8   | "Start the game" is `disabled`: unfocusable and gives no reason                                                                    | 3.3.1, heuristic: error prevention | REQ-0002-08 |
| 9   | `border-0` on primary and step buttons; state shown by border color only                                                           | forced colors                      | REQ-0002-09 |
| 10  | Fixed bar (≈ 176 px with the footer) can cover focused fields at 200% zoom                                                         | 2.4.3, 1.4.10                      | REQ-0002-10 |
| 11  | Two-tap reset: no timeout, no announcement                                                                                         | heuristic: error prevention        | REQ-0002-11 |
| 12  | Settle primary is "Back to Setup"                                                                                                  | heuristic: match the next task     | REQ-0002-12 |
| 13  | Table − stays enabled at 0; Setup −/+ disable at their limits                                                                      | consistency                        | REQ-0002-13 |
| 14  | Count mismatch is bold plus color; its text is sr-only                                                                             | 1.4.1                              | REQ-0002-14 |
| 15  | "Tap +", "Tap Take photo", "Tap again"                                                                                             | device-agnostic copy               | REQ-0002-15 |
| 16  | 13 px step labels and footer, 14 px hints                                                                                          | readability in low light           | REQ-0002-16 |
| 17  | No hover styles                                                                                                                    | affordance                         | REQ-0002-17 |
| 18  | `disabled:opacity-45`                                                                                                              | predictable contrast               | REQ-0002-18 |
| 19  | `PLAYERS_BUTTON` (border-2, rounded-lg) vs `STEP_BUTTON` (borderless in a border-control group)                                    | consistency                        | REQ-0002-19 |
| 20  | `rounded-2xl` cards, `rounded-xl` payments, `border-b` rows                                                                        | consistency                        | REQ-0002-20 |
| 21  | Photo control styled ad hoc as a `<label>`                                                                                         | consistency                        | REQ-0002-21 |
| 22  | Count cells: `focus:outline-none` + `focus-within:ring-2 ring-accent`                                                              | 2.4.7, consistency                 | REQ-0002-22 |
| 23  | `Notice`: ok = green text, warn = filled box                                                                                       | 1.4.1, consistency                 | REQ-0002-23 |
| 24  | Setup `h1` is "Chip Ledger"; `error.tsx` and `not-found.tsx` copy the `PageTitle` classes                                          | 2.4.6, consistency                 | REQ-0002-24 |
| 25  | Back buttons are named "Setup" / "Table" / "Cash out", but Settle says "Back to Setup"                                             | consistency                        | REQ-0002-25 |
| 26  | `w-23`, `h-42.5`, `size-13`, `py-1.75`, `w-9.5`, `max-w-[40ch]`, `grid-cols-[1fr_auto]`                                            | tokens-only rule                   | REQ-0002-26 |

## 2. Constitution check

| Invariant group           | Complies? | Notes                                                                                                            |
| ------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| Governance (01–03, 16–18) | Yes       | Spec first; SPEC-0001 amendments listed in §3; docs updated with the code                                        |
| Architecture (04–07)      | Yes       | UI layer and tokens only; no new layer or dependency; `lib/` untouched except copy constants if needed           |
| Security (08–11)          | Yes       | No input, endpoint, CSP, or header change; no inline styles                                                      |
| Quality (12–15)           | Yes       | Raises a11y (CONSTITUTION-12); every requirement gets tests; visual baselines refreshed; Lighthouse budgets kept |

## 3. Design

- **Layers touched:** ui (`app/components`), routes (`app/ChipLedgerApp.tsx`, `app/error.tsx`, `app/not-found.tsx`), and styles (`styles/tokens.css`, `app/globals.css`). Domain changes are limited to the step-title constants. `lib/infra` is untouched.
- **New components** (each with a doc in `docs/components/`):
  - `Stepper`: − value +, a label, min/max, and disabled ends. Used by Setup (players) and Table (buy-ins).
  - `Card` and `ListRow`: one radius, border, and padding each.
  - `ConfirmInline`: message, Cancel, a destructive confirm, focus management, and `Esc`.
  - `LiveAnnouncer`: one polite region per screen, fed by the container.
- **Changed components:** `StepsNav` (check mark, "(done)", font size), `PlayerCashCard` (visible color names, `outline` button, name per REQ-0002-03), `ChipRow` and `SetupScreen` (visible labels and a header row), `TableScreen` (Stepper, copy), `CountCheck` (visible short/over text), `SettleScreen` (ConfirmInline, textarea border, content buttons), `Notice` (icon plus box for every kind), `Button` (`outline` variant, hover, disabled tokens, `aria-disabled` support), `Typography` (`PageTitle` forwards a ref and `tabIndex=-1`; brand line), `ActionBar` (scroll padding and the short-viewport media query).
- **Tokens added:** `--color-accent-hover`, `--color-surface-hover`, `--color-disabled-bg`, `--color-disabled-ink`, and a recalculated `--color-step-done` (≥ 3:1 in both themes), plus size tokens replacing the one-offs in REQ-0002-26. All of them get light and dark values and a contrast row in `DESIGN_SYSTEM.md`.
- **SPEC-0001 amendments:** REQ-0001-02 (Settle bar), REQ-0001-24 (reset flow), REQ-0001-27 (the look: visual baselines change), REQ-0001-14 (photo control name). SPEC-0001's text is updated in the implementation PR to point at the SPEC-0002 requirements.
- **Control flow (focus on step change):** `go(screen)` → dispatch → an effect on `game.screen` (already used for `scrollTo`) → `titleRef.current?.focus({ preventScroll: true })` and `document.title = …`. It is skipped on the first mount, so focus is not stolen on page load.

## 4. Testing strategy

| Requirement    | Unit                                                | Component                                      | E2E                                     | Visual                             | A11y                              |
| -------------- | --------------------------------------------------- | ---------------------------------------------- | --------------------------------------- | ---------------------------------- | --------------------------------- |
| REQ-0002-01    |                                                     | PlayerCashCard: visible color text             | enterCounts still passes                | Cash out                           | axe                               |
| REQ-0002-02    |                                                     | ChipLedgerApp: focus and title                 | Enter → focus on `h1`, Tab order        |                                    | keyboard walkthrough              |
| REQ-0002-03    |                                                     | PlayerCashCard name per state                  |                                         |                                    | axe `label-content-name-mismatch` |
| REQ-0002-04    | contrast helper on tokens                           | StepsNav "(done)"                              |                                         | all steps                          | axe                               |
| REQ-0002-05    |                                                     | SetupScreen/ChipRow labels                     | helpers updated for names               | Setup                              | axe                               |
| REQ-0002-06    |                                                     | SettleScreen fallback                          |                                         | Settle fallback                    |                                   |
| REQ-0002-07    |                                                     | LiveAnnouncer messages, debounce by kind       |                                         |                                    |                                   |
| REQ-0002-08    |                                                     | Button `aria-disabled`; focus to field         | cleared buy-in flow                     |                                    | axe                               |
| REQ-0002-09    |                                                     |                                                |                                         | `forcedColors: "active"` snapshots |                                   |
| REQ-0002-10    |                                                     |                                                | short viewport; focused field above bar |                                    |                                   |
| REQ-0002-11    |                                                     | ConfirmInline: focus, Esc, Cancel              | reset flow (replaces AC-0001-10)        | Settle confirm open                | axe                               |
| REQ-0002-12    |                                                     | ChipLedgerApp bar labels                       | new-game flow                           | Settle                             |                                   |
| REQ-0002-13    |                                                     | Stepper disabled at min                        | Table − at 0                            |                                    |                                   |
| REQ-0002-14    | `countCheckRows` short/over text                    | CountCheck                                     |                                         | Cash out mismatch                  |                                   |
| REQ-0002-15    | grep in a unit test over copy constants             |                                                |                                         |                                    |                                   |
| REQ-0002-16–18 | contrast helper (disabled tokens)                   |                                                | hover (desktop project)                 | all steps                          |                                   |
| REQ-0002-19–23 |                                                     | Stepper, Card, ListRow, Notice, Button outline |                                         | all steps                          | axe                               |
| REQ-0002-24    |                                                     | Typography, error, not-found                   | `openFresh` heading is "Setup"          | all steps                          |                                   |
| REQ-0002-25    |                                                     | bar names                                      | helpers updated                         | all steps                          |                                   |
| REQ-0002-26    | lint rule or test: no arbitrary values under `app/` |                                                |                                         |                                    |                                   |

Test helpers in `test/e2e/helpers.ts` that match on `getByLabel` keep working because the accessible names are preserved (REQ-0002-01, -05). `openFresh` changes its heading assertion to "Setup", and the "Cash out" bar button becomes "Cash out" (forward) and "Back to Cash out" (back), so selectors using `exact: true` stay unique.

## 5. Risks and mitigations

| Risk                                                    | Likelihood | Impact | Mitigation                                                                                                                                                                                                  |
| ------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Every visual baseline changes, which makes review noisy | High       | Medium | One phase per PR; before/after screenshots in each PR; macOS and Linux baselines refreshed together                                                                                                         |
| Focus moving to `h1` surprises mouse users with a ring  | Medium     | Low    | The ring shows only for `:focus-visible`, and programmatic focus on a `tabIndex=-1` heading does not show it in modern browsers; `outline: none` is scoped to `h1[tabindex="-1"]:focus:not(:focus-visible)` |
| Visible labels make Setup taller on 320 px              | Medium     | Low    | A header row instead of per-field labels (spec §7 question); check at 320 px and 200% zoom                                                                                                                  |
| `aria-disabled` lets the button be activated            | Low        | Medium | The handler no-ops apart from moving focus; unit test                                                                                                                                                       |
| Changing the Settle primary surprises existing users    | Low        | Low    | The old action stays one press away in the content ("Back to Setup")                                                                                                                                        |
