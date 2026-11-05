# Plan: SPEC-0005 Card Room — a new visual identity

| Field  | Value                |
| ------ | -------------------- |
| Spec   | [spec.md](./spec.md) |
| ADR    | none (Tier 1)        |
| Status | implemented          |

## 1. Approach

The design system is token-driven ([Design System](../../DESIGN_SYSTEM.md)), so most of the change is new values in `styles/tokens.css` and new classes in the shared components (`Button`, `Stepper`, `StepsNav`, `Surfaces`, `BrandMark`). Screens change only where an approved UX change needs it: Table (pot first, avatars) and Settle (order, bars, short labels, balance line).

Why Tier 1 and no ADR: no new layer, dependency, data model, API, or security rule. `next/font/google` is already in use (Bricolage Grotesque); Geist and Geist Mono replace it through the same loader, self-hosted at build time, so no package is added and the CSP stays `font-src 'self'`. The two new pure helpers (initial letter, ranked results) live in `lib/` with unit tests, as the layer rules require.

## 2. Constitution check

| Invariant group           | Complies? | Notes                                                                                   |
| ------------------------- | --------- | --------------------------------------------------------------------------------------- |
| Governance (01–03, 16–18) | Yes       | Spec first; amendments to SPEC-0002 listed in spec §4.3 and §7 for owner approval.      |
| Architecture (04–07)      | Yes       | UI stays props in, events out. Sorting and initials are pure functions in `lib/`.       |
| Security (08–11)          | Yes       | No headers, inputs, or secrets change. Fonts stay self-hosted.                          |
| Quality (12–15)           | Yes       | Contrast test extended to new tokens; a11y, visual, and Lighthouse gates run unchanged. |

## 3. Design

- **Layers touched:** ui (`app/components`), routes (`app/layout.tsx`, `app/globals.css`, icons), domain (`lib/`).

### Palette (REQ-0005-01)

Values from the canvas, corrected where the token test needs it. As built: the light brass fill is `#a5803a` (the canvas's `#b8913f` is only 2.6:1 against the page, too faint for step bars; `#a5803a` is 3.2:1 and keeps its ink at 5.1:1), so the step bars use `--color-accent` and `--color-border-control` and need no tokens of their own. Focus is `#7a5c1e` / `#f2d58c`, and the full table with ratios is in [Design System](../../DESIGN_SYSTEM.md).

| Token                     | Light     | Dark      | Use                                           |
| ------------------------- | --------- | --------- | --------------------------------------------- |
| `--color-bg`              | `#f3f1ec` | `#0d0e10` | Page (the room)                               |
| `--color-surface`         | `#ffffff` | `#16181b` | Panels and rows                               |
| `--color-border`          | `#e2ded5` | `#2c3036` | Panel edges (decorative)                      |
| `--color-border-control`  | `#8c8a84` | `#6b7078` | Field and outlined-button edges, ≥ 3:1        |
| `--color-text`            | `#17181b` | `#edeae3` | Body text                                     |
| `--color-text-muted`      | `#62646a` | `#9b9da1` | Secondary text                                |
| `--color-accent`          | `#a5803a` | `#cdaa63` | Brass fill: primary buttons, + key, step bars |
| `--color-accent-ink`      | `#17130a` | `#17130a` | Text on brass                                 |
| `--color-accent-text` new | `#7a5c1e` | `#cdaa63` | Brass used as text or icon                    |
| `--color-felt` new        | `#134a37` | `#0f3a2b` | Pot panel                                     |
| `--color-felt-ink` new    | `#ffffff` | `#ffffff` | Text on felt                                  |
| `--color-felt-muted` new  | `#cfe0d6` | `#cfe0d6` | Secondary text on felt                        |
| `--color-success`         | `#1d7448` | `#6fcf97` | Gains (light unchanged)                       |
| `--color-danger`          | `#b0342b` | `#f08a7e` | Losses (light unchanged)                      |
| `--color-avatar` new      | `#ece8df` | `#23262b` | Avatar fill                                   |

**Step bars (REQ-0005-04).** In the light theme no brass shade is both ≥ 3:1 against the page and visibly lighter than the current step's brass, so the canvas's pale "done" bar cannot pass. Bars therefore work like a filled progress bar in both themes: done and current steps use brass, later steps grey. The check mark tells done from current, and the current step has a bold name and a 4 px bar (3 px for the others). This is a correction to the mock, not a behavior change.

### Files

- **Changed:**
  - `styles/tokens.css` (palette, `--font-sans` and `--font-mono`)
  - `app/layout.tsx` (load `Geist` and `Geist_Mono` instead of `Bricolage_Grotesque`)
  - `app/globals.css` (compact-header rules: 44 px step buttons, bars only)
  - `app/components/Button.tsx` (`rounded-lg`, outlined secondary)
  - `app/components/Stepper.tsx` (44 px keys, − outlined, + brass; Setup's boxed stepper keeps the field box)
  - `app/components/StepsNav.tsx` (bars instead of circles)
  - `app/components/AppHeader.tsx` (brand row sizes)
  - `app/components/BrandMark.tsx`, `app/icon.svg`, `app/apple-icon.png` (single brass chip)
  - `app/components/TableScreen.tsx` (pot panel first, avatars)
  - `app/components/SettleScreen.tsx` (ranked rows, bars, short labels, balance line, payment avatars)
  - `app/components/Surfaces.tsx` (new `FeltPanel`)
- **New:**
  - `app/components/Avatar.tsx` (decorative initial; hidden at 320 px when `optional`)
  - `initialOf` in `lib/game.ts`, `rankByNet` in `lib/settlement.ts`, `withoutCurrency` in `lib/money.ts` (existing modules)
  - `app/manifest.ts` and `webManifest()`, `ROOM_COLORS`, `THEME_COLORS` in `lib/seo.ts` (REQ-0005-16, -17)
  - `app/opengraph-image.tsx`: built at build time by `next/og`, which ships with Next.js and uses Geist (REQ-0005-18)
  - `app/favicon.ico` and `public/icons/` (192, 512, maskable 512), rendered once from the chip drawing (REQ-0005-16, -19)
- **Removed:** none.
- **Data model and contracts:** unchanged.

## 4. Testing strategy

| Requirement      | Unit                       | Component                        | E2E                     | Visual        | A11y |
| ---------------- | -------------------------- | -------------------------------- | ----------------------- | ------------- | ---- |
| REQ-0005-01, -04 | `tokens.test.ts` pairs     |                                  |                         | all steps     | axe  |
| REQ-0005-02      | source check: no Bricolage |                                  | computed font family    |               |      |
| REQ-0005-05      |                            | Table: pot panel first           | pot amount after rebuy  | Table         | axe  |
| REQ-0005-06      | `initialOf`                | avatar `aria-hidden`             |                         | Table, Settle | axe  |
| REQ-0005-07      | `rankByNet` incl. ties     | Settle row order                 | Settle order            | Settle        |      |
| REQ-0005-08      |                            | bar side and width               |                         | Settle        |      |
| REQ-0005-09      |                            | line shown / absent              | balanced game           | Settle        |      |
| REQ-0005-10      |                            | visible and accessible text      |                         | Settle        | axe  |
| REQ-0005-11      |                            | BrandMark                        | icon routes serve types |               |      |
| REQ-0005-12      |                            |                                  | compact step height     | scrolled      |      |
| REQ-0005-13      |                            | names, `aria-current`, done text | open any step           | forced-colors | axe  |
| REQ-0005-14, -15 | source check classes       | button and stepper classes       |                         | all steps     |      |

Existing tests that cite REQ-0002-27, -29, -31 are updated to cite the SPEC-0005 requirement that replaces them, once §7 is approved.

## 5. Risks and mitigations

| Risk                                              | Likelihood | Impact | Mitigation                                                                         |
| ------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------- |
| Brass on light backgrounds fails contrast         | Medium     | Medium | Separate `accent-text` token; token test blocks the merge.                         |
| Visual baselines churn hides a real regression    | High       | Medium | Review every image diff in the PR; refresh Linux baselines via the CI label.       |
| Second font family hurts Lighthouse performance   | Low        | Low    | `next/font` subsets and preloads; Lighthouse gate stays at 90.                     |
| Header wraps at 320 px with the new wordmark size | Medium     | Low    | Check at 320 px; the roadmap's 320 px header item stays the fix if it still wraps. |

## 6. Rollout and rollback

Direct release, no flag: the change is visual and has no data migration. Saved and shared games load unchanged. Roll back by reverting the PR.

## 7. Documentation to update

- [x] `docs/DESIGN_SYSTEM.md`: palette, type, shapes, brand mark, step bars
- [x] `docs/components/` entries for `Avatar`, `FeltPanel`, and changed components
- [x] SPEC-0002: note that REQ-0002-27, -29, -31 are amended by SPEC-0005 (and SPEC-0001 REQ-0001-27 replaced)
- [x] `docs/ROADMAP.md`: remove the reskin item (approved 2026-11-05)
- [x] `docs/specs/README.md`: index row
- [ ] `sdd.yaml`: no change (no structure, gate, or service changes)
