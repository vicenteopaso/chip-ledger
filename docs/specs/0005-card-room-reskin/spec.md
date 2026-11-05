# SPEC-0005: Card Room — a new visual identity

| Field   | Value                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | approved                                                                                                                                                                                                |
| Tier    | 1                                                                                                                                                                                                       |
| Owner   | @vicenteopaso                                                                                                                                                                                           |
| Created | 2026-11-05                                                                                                                                                                                              |
| Related | Roadmap item "Reskin the UI" (removed when approved) · amends [SPEC-0002](../0002-a11y-ux-polish/spec.md) REQ-0002-27, -29, -31 (see §7) · [plan](./plan.md) · [tasks](./tasks.md) · ADR: none (Tier 1) |

## 1. Problem

Chip Ledger works, but it looks like a prototype. Hosts show it to friends at the table, and settling money between people needs to look trustworthy: a soft, playful look makes the numbers feel less reliable than they are. Two things also slow people down today. On Table, the pot is below the player list, so the number everyone asks about is off screen once there are more than four players. On Settle, results follow seating order, so finding who won most means reading every row.

The design direction "B · Card Room" was chosen by the owner on 2026-11-05 from three proposals ([design canvas](https://claude.ai/artifact/NpHB4y8zdfw7jzupQ11vhU)). The owner approved seven UX changes on the same day (§4.2).

## 2. Goals and non-goals

**Goals**

- Replace the visual identity with Card Room in both themes: a dark card-room palette, felt green for the most important number, brass for the one action that moves the game forward, Geist for text and Geist Mono for money.
- Make the seven approved UX changes in §4.2.
- Keep WCAG 2.1 AA in both themes, with every contrast pair checked by the existing token test.

**Non-goals**

- No change to the flow, steps, data model, storage format, settlement math, sharing, or the API.
- No change to copy, except the wording in REQ-0005-11 and the new line in REQ-0005-10.
- No change to theme selection: the theme still follows the system setting and the theme button still overrides it. Dark is not forced.
- No change to sticky-header behavior: it still shrinks once scrolled, still hides Games and Share while small, and is still static on short screens.
- The 320 px one-line header (Roadmap: "Make the header fit on one line at 320 px") is a separate change.

## 3. User stories

| ID    | Priority | Story                                                                                                     |
| ----- | -------- | --------------------------------------------------------------------------------------------------------- |
| US-01 | P1       | As a host, I want the app to look serious and well made so that friends trust the payments it shows.      |
| US-02 | P1       | As a host at the table, I want the pot at the top of Table so that I can answer "what's in?" at a glance. |
| US-03 | P2       | As a player reading Settle, I want results ranked from the biggest winner down so I can find mine fast.   |
| US-04 | P2       | As a host, I want a clear line that says the money balances so that I can settle without re-adding.       |

## 4. Requirements

### 4.1 Visual system

- REQ-0005-01: `styles/tokens.css` MUST define the Card Room palette for both themes (values in [plan](./plan.md) §3). Every text pair MUST reach 4.5:1 and every control, state, and focus edge MUST reach 3:1, checked by `test/unit/styles/tokens.test.ts`.
- REQ-0005-02: Interface text MUST use Geist and money in lists and results MUST use Geist Mono with tabular figures, both self-hosted by `next/font`. The Content Security Policy MUST stay unchanged (`font-src 'self'`).
- REQ-0005-03: The felt color MUST appear at most once per screen, behind that screen's most important number (the pot on Table). The brass fill MUST be used only for primary actions and the add (+) key.
- REQ-0005-04: Step-indicator bars MUST reach 3:1 against the page in every state and both themes. (The canvas mock's grey "upcoming" bar and light-theme "done" bar do not; the implementation corrects them.)

### 4.2 Approved UX changes (owner approval 2026-11-05)

- REQ-0005-05 (change 1): On Table, the pot MUST come first in `main`, above the player list, in a felt panel showing "Money in the pot", the amount, and "<n> buy-ins so far." The panel MUST NOT be a live region; the page announcer keeps announcing changes (REQ-0002-07).
- REQ-0005-06 (change 2): Each Table player row and each Settle payment MUST show a round avatar with the first letter of the player's name, upper-cased. The avatar MUST be hidden from assistive technology (`aria-hidden="true"`). Players who share a first letter show the same letter.
- REQ-0005-07 (change 3): Settle results MUST be sorted by net amount, highest first. Players with the same net MUST keep seating order. The copied results MUST use the same order (owner decision, Q4).
- REQ-0005-08 (change 4a): Each Settle result row MUST show a bar for its net: to the right in the gain color for a gain, to the left in the loss color for a loss, none for zero. Its length MUST be the player's absolute net divided by the largest absolute net. The bar MUST be hidden from assistive technology, because the net is already in text.
- REQ-0005-09 (change 4b): Settle MUST show "<money in> in, <money out> out. Balanced." with a check mark below the results when the cash-outs used for payments add up to the money in. When they do not, the line MUST NOT appear and the existing difference notice and options (REQ-0002-33) apply unchanged.
- REQ-0005-10 (change 5): Each Settle result row MUST read "In <amount> · Out <amount>" without the currency symbol, replacing "Put in <amount>" and "Cashed out <amount>". The row's text for assistive technology MUST stay in full words: "Put in <amount with symbol>, cashed out <amount with symbol>".
- REQ-0005-11 (change 6): The brand mark MUST be a single brass chip. `app/icon.svg` and `app/apple-icon.png` MUST be the same drawing (amends REQ-0002-29).
- REQ-0005-12 (change 7): In the shrunk header, each step button MUST be at least 44 px tall (today 40 px).

### 4.3 Visual changes to approved SPEC-0002 rules (owner approval 2026-11-05, see §7)

- REQ-0005-13: The step navigation MUST stay an ordered list of four buttons that can each be opened at any time (REQ-0001-01). Each step MUST show a bar and its name. The bars fill like a progress bar: done and current steps in brass, later steps in grey. Done steps also show a check mark and "(done)" for assistive technology; the current step has a thicker bar, a bold name, and `aria-current="step"`. (The canvas shows a dimmer brass for done steps; that shade fails 3:1 in the light theme, see REQ-0005-04.) Step numbers are not shown but stay in each button's accessible name ("2 Table"). In the shrunk header only the bars show; the names stay for assistive technology. In forced-colors mode the three states MUST stay distinct. (Replaces the numbered circles of REQ-0002-27.)
- REQ-0005-14: Buttons MUST be rounded rectangles (`--radius-lg`, 14 px) instead of pills. Primary is brass-filled; secondary is the panel color with the panel border, as in the canvas (fields keep the 3:1 control border, so a button never looks like a field; a button is identified by its label); danger keeps a soft danger tint. Notices keep REQ-0002-31 (tinted panel, 4 px colored rule on the left). (Changes the button shapes of REQ-0002-31.)
- REQ-0005-15: The Table −/+ keys MUST be 44 px circles: − outlined in the control border, + brass-filled. (Today both are 40 px circles in the soft accent tint.)

### 4.4 Bookmarks, installing, and link previews (owner approval 2026-11-05)

Added after review: before this spec the app had only an SVG favicon and an Apple home-screen icon.

- REQ-0005-16: The app MUST serve a web app manifest linked from every page, with the name "Chip Ledger", `start_url` "/", `display` "standalone", the dark room color as background and theme color, and 192 px and 512 px icons plus a 512 px maskable icon, all drawn from the brass chip mark. The manifest MUST NOT claim offline support (that is a separate roadmap item).
- REQ-0005-17: Every page MUST set a theme color per system theme: the light page color under `prefers-color-scheme: light` and the dark one under `dark`, equal to `--color-bg` in each theme.
- REQ-0005-18: Every page MUST have a 1200 × 630 Open Graph image with alt text, used as a large card for Twitter/X too. It MUST show the brand, the app's description, and a sample pot and payments in the Card Room look, and MUST NOT show data from a real game (a shared game's link previews the same image).
- REQ-0005-19: The app MUST serve `/favicon.ico` with 16, 32, and 48 px frames of the favicon drawing, for browsers and tools that ask for it.

## 5. Acceptance criteria

- AC-0005-01 (REQ-0005-01, -04): The token test reports every listed text pair ≥ 4.5:1 and every control, state, focus, and step-bar color ≥ 3:1 against its background in both themes.
- AC-0005-02 (REQ-0005-02): The page's computed `font-family` starts with Geist; a Settle net's computed family starts with Geist Mono and has `font-variant-numeric: tabular-nums`. The CSP header is identical to `main`.
- AC-0005-03 (REQ-0005-05): Given Table with 6 players, the first element in `main` after the title and intro is the pot panel, and its text is "Money in the pot", the pot amount, and "6 buy-ins so far."
- AC-0005-04 (REQ-0005-06): Given players "ana" and "Alex", both rows show "A"; the avatar elements have `aria-hidden="true"`; and each row's accessible text does not contain the letter by itself.
- AC-0005-05 (REQ-0005-07): Given nets Ana +0.80, Ben −2.80, Carla +2.80, Dev −0.80 in that seating order, results show Carla, Ana, Dev, Ben, and the copied results list them in the same order. Given two players at +1.00, they keep seating order.
- AC-0005-06 (REQ-0005-08): Given nets +2.80, +0.80, −0.80, −2.80, the bars are 100 %, 29 %, 29 %, and 100 % of their half-width, with the first two in the gain color pointing right; a player with net 0 has no bar.
- AC-0005-07 (REQ-0005-09): Given €60.00 in and €60.00 counted, Settle shows "€60.00 in, €60.00 out. Balanced."; given €60.00 in and €57.60 counted with sharing off, the line is absent and the difference notice shows.
- AC-0005-08 (REQ-0005-10): A result row shows "In 20.00 · Out 22.80" and its text for assistive technology is "Put in €20.00, cashed out €22.80".
- AC-0005-09 (REQ-0005-11): `app/icon.svg` and the header mark draw one chip in the brass token colors; the 180 × 180 `apple-touch-icon` serves `image/png`.
- AC-0005-10 (REQ-0005-12): After scrolling past 48 px, each step button's height is ≥ 44 px.
- AC-0005-11 (REQ-0005-13): Given Table, the navigation is a list of four buttons named "1 Setup (done)", "2 Table", "3 Cash out", "4 Settle"; button 2 has `aria-current="step"`; activating button 4 opens Settle. The forced-colors snapshot shows the three states.
- AC-0005-12 (REQ-0005-14, -15): Component tests find `rounded-lg` and no `rounded-full` on every button variant, `border-l-4` on notices, and `size-11 rounded-full` on the Table −/+ keys.
- AC-0005-14 (REQ-0005-16, -19): The page links `/manifest.webmanifest` (`application/manifest+json`); every icon it lists is served as a PNG of its stated size; `/favicon.ico` is served as `image/x-icon` with three frames.
- AC-0005-15 (REQ-0005-17): The page has two `theme-color` metas, `#f3f1ec` for light and `#0d0e10` for dark, and a unit test finds them equal to the tokens.
- AC-0005-16 (REQ-0005-18): `og:image` is a 1200 × 630 PNG with `og:image:alt` starting "Chip Ledger: ", and `twitter:card` is `summary_large_image`.
- AC-0005-17 (REQ-0005-18): The image's sample names and amounts are fixed in code; `/g/<id>` pages use the same image.
- AC-0005-13: `pnpm test:a11y` reports no axe violations in either theme, and every visual baseline is refreshed in the same PR.

## 6. Cross-cutting concerns

- **Accessibility:** Contrast is checked by the token test (REQ-0005-01, -04). Decorative avatars and bars are hidden from assistive technology (REQ-0005-06, -08). Short visible labels keep full-word text for screen readers (REQ-0005-10). Touch targets stay ≥ 44 px, and the shrunk header's step buttons grow to meet it (REQ-0005-12). The global focus outline (REQ-0002-22) and forced-colors support (REQ-0002-09) are kept.
- **Security:** No change. Fonts are self-hosted by `next/font`, so the CSP is unchanged.
- **Privacy:** N/A: no data collected, stored, or sent changes.
- **Performance:** Geist and Geist Mono replace Bricolage Grotesque: two font families instead of one, both subset to Latin by `next/font`. Lighthouse budgets in `sdd.yaml` (performance ≥ 90) must still pass.
- **Error states:** The error and not-found pages take the new tokens only; their content does not change.
- **i18n / localization:** N/A: not adopted.
- **SEO:** The icons change (REQ-0005-11). Pages gain a manifest, theme colors, and an Open Graph image shown as a large card (REQ-0005-16 … -19); title, description, canonical, and robots are unchanged. The preview image never shows real game data.

## 7. Open questions

All resolved by the owner on 2026-11-05.

- Q1 (REQ-0005-13): Labelled step bars replace SPEC-0002's numbered circles; numbers stay in the accessible names only. **Approved.**
- Q2 (REQ-0005-14): 14 px rounded-rectangle buttons replace pills; the secondary button is outlined instead of a soft brass tint. **Approved.**
- Q3 (REQ-0005-15): Table −/+ keys become 44 px circles, − outlined and + brass. **Approved.**
- Q4 (REQ-0005-07): Copied results follow the ranked order shown on screen. **Approved.**

## 8. References

- Design canvas: <https://claude.ai/artifact/NpHB4y8zdfw7jzupQ11vhU> (row "B · Card Room", dark and light, including the scrolled header)
- [Design System](../../DESIGN_SYSTEM.md) · [SPEC-0002](../0002-a11y-ux-polish/spec.md) · [Roadmap](../../ROADMAP.md)
