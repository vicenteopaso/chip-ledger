# SPEC-0002: Accessibility, UX, and consistency pass

| Field   | Value                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Status  | approved                                                                                                                       |
| Tier    | 1                                                                                                                              |
| Owner   | @vicenteopaso                                                                                                                  |
| Created | 2026-10-30                                                                                                                     |
| Related | Amends [SPEC-0001](../0001-chip-ledger/spec.md) · [plan](./plan.md) · [tasks](./tasks.md) · [Roadmap item 1](../../ROADMAP.md) |

## 1. Problem

SPEC-0001 moved the prototype into the repository with the same look and behavior, and passes the automated axe audit in both themes. A manual audit of every component (2026-10-30) found gaps that automated tools do not catch, plus inconsistencies carried over from the prototype:

- **Accessibility.** Some information is conveyed by color alone (Cash out count cells, done steps); keyboard focus is dropped when the step changes; one control's accessible name does not contain its visible text; several state changes are not announced; fields rely on hidden labels and placeholders; high-contrast (forced-colors) mode loses step and button edges; the fixed bottom bar can cover the focused field when zoomed.
- **Experience.** The destructive reset has a weak confirmation; the last step's primary action leads away from the likely next task; some controls are disabled without saying why; copy assumes a touch screen; small text sizes are used in an app that is read across a dim table; there are no hover states.
- **Consistency.** The same pattern is built two or three ways (steppers, cards and rows, notices, focus rings, outlined buttons), headings and bottom-bar labels follow different rules per step, and one-off sizes bypass the tokens.

Hosts use this app on a phone, often one-handed, in low light, with others reading over their shoulder. These gaps make it slower and less trustworthy for everyone, and unusable in places for people who use a screen reader, keyboard, or high-contrast mode, or who have a color-vision deficiency.

## 2. Goals and non-goals

**Goals**

- Close every gap in §4 so the app meets WCAG 2.1 AA under manual review, not only axe.
- Make each recurring pattern one shared component with one look.
- Keep the flow, data model, storage format, and settlement math unchanged.

**Non-goals**

- A new visual identity (Roadmap item 3). Colors change only where a contrast fix needs it.
- Enabling photo counting (Roadmap item 2). Photo-related requirements here apply when the flag is on.
- Offline support, i18n, or new game features (adding players mid-game, undo history).
- WCAG 2.2 conformance as a target. REQ-0002-10 happens to satisfy 2.4.11, but the target stays 2.1 AA.

## 3. User stories

| ID    | Priority | Story                                                                                                                                                   |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | P1       | As a host with a color-vision deficiency, I want every chip count labelled in words so that I don't enter red counts into the green field.              |
| US-02 | P1       | As a screen-reader user, I want to hear which step I am on, and keep my place, when I move between steps.                                               |
| US-03 | P1       | As a keyboard or high-contrast user, I want every control and state to stay visible and reachable.                                                      |
| US-04 | P2       | As a host at the end of the night, I want the obvious next action to be the next game, and I want erasing everything to need a deliberate confirmation. |
| US-05 | P2       | As any player reading the screen across the table, I want text large enough to read and controls that behave the same everywhere.                       |
| US-06 | P3       | As a maintainer, I want one component per pattern so that fixes apply everywhere at once.                                                               |

## 4. Requirements

### Accessibility (P1)

- REQ-0002-01: Every count input on Cash out MUST show the chip's color name as visible text next to the chip artwork ("Chips" in one-value mode, so the visible text stays inside the name "Chips for <name>" from AC-0001-14). The input's accessible name MUST stay "<Color> chips for <name>".
- REQ-0002-02: When the step changes, focus MUST move to that step's `h1`, which MUST be focusable by script only (`tabIndex=-1`) and show no focus ring for this programmatic focus. The document title MUST become "<Step title> · Chip Ledger".
- REQ-0002-03: The photo control's accessible name MUST start with its visible text: "Take photo of <name>'s chips", "Retake photo of <name>'s chips", or "Counting… <name>'s chips".
- REQ-0002-04: Steps before the current one MUST show a visible check mark in addition to their border, and MUST carry the visually hidden text "(done)". Every step-indicator border that conveys state MUST reach 3:1 against `--color-bg` in both themes.
- REQ-0002-05: Player names, buy-in, and currency MUST have visible labels. Chip rows MUST show visible column headers (Color, Per player, Value) once above the rows (hidden from assistive technology, because each field's name already contains its header text), and each row's fields MUST be named per row: "<Color> chip color", "<Color> chips per player", "<Color> chip value". Placeholders MUST NOT be the only visible label.
- REQ-0002-06: Every text field and read-only text area MUST use the `border-control` color (3:1). This includes the copy-fallback field on Settle.
- REQ-0002-07: Each screen MUST have exactly one polite live region that announces state changes in words: "<n> players", "<name>: <n> buy-ins, pot <amount>", "Results copied", and the reset confirmation opening. The Setup and Cash out summaries MUST be announced only when their message kind changes (ok ↔ warning, or a different warning), not on every keystroke.
- REQ-0002-08: "Start the game" MUST stay focusable when it cannot be used. It MUST be marked `aria-disabled="true"`, MUST be described by the Setup summary (`aria-describedby`), and activating it MUST move focus to the first invalid field. The buy-in field MUST have `aria-invalid="true"` while the buy-in is ≤ 0.
- REQ-0002-09: Under `forced-colors: active`, buttons, fields, the current step, done steps, and the count-mismatch marker MUST stay distinguishable. Controls MUST use transparent borders instead of no border, so system colors can paint them.
- REQ-0002-10: A focused element MUST NOT be hidden by the bottom bar. The page MUST reserve scroll padding equal to the bar's height. When the viewport is 480 px tall or less, the bar MUST scroll with the content instead of staying fixed.

### Experience (P2)

- REQ-0002-11: "Start over from scratch" MUST open an inline confirmation in place of the button. It MUST read "Erase everything? Names, chips, and buy-ins will be cleared.", MUST offer "Cancel" and "Erase everything" (danger style), and MUST move focus to "Cancel". `Esc` or Cancel MUST close it and return focus to "Start over from scratch". Leaving the step MUST close it. _Amends REQ-0001-24._
- REQ-0002-12: Settle's bottom bar MUST offer a secondary "‹ Cash out" and the primary "New game, same players", which behaves as REQ-0001-23. The content area MUST keep "Copy results", "Back to Setup" (secondary), and "Start over from scratch". _Amends REQ-0001-02._
- REQ-0002-13: On Table, a player's − button MUST be unavailable at 0 buy-ins, matching the Setup player-count stepper. Both steppers MUST mark their limit with `aria-disabled` rather than `disabled`, so keyboard focus stays on the button that reached it.
- REQ-0002-14: A count mismatch in "Check the count" MUST be visible as text ("<n> short" or "<n> over") in addition to color and weight.
- REQ-0002-15: Instruction copy MUST NOT assume touch. "Tap" becomes "Press" or is reworded (for example "Press + whenever someone buys back in…"). The text of the removed two-tap flow goes away with REQ-0002-11.
- REQ-0002-16: Text on interactive controls and body hints MUST be at least `--text-md` (15 px). This covers step labels, hints, chip-row summaries, photo status, and the footer, whose minimum is `--text-sm` (14 px).
- REQ-0002-17: Primary, secondary, danger, link, and stepper buttons MUST have a hover state from tokens, applied only under `(hover: hover)`.
- REQ-0002-18: Disabled controls MUST use dedicated disabled tokens (`--color-disabled-bg`, `--color-disabled-ink`) instead of opacity. Disabled text MUST stay at least 3:1 against its background in both themes, so it reads as unavailable but remains readable.

### Consistency (P3)

- REQ-0002-19: The Setup player count and each Table buy-in counter MUST use one stepper component, with one size, border, and disabled behavior.
- REQ-0002-20: Grouped content (Cash out player cards, payments) MUST use one card style, and lists (Setup chip rows, Table players, results) MUST use one row style, each with one radius, border, and padding token.
- REQ-0002-21: The photo control MUST use the shared button styles (a new `outline` variant) while staying a native file input.
- REQ-0002-22: Every focusable element MUST use the global focus outline (`--color-focus`, 3 px, 2 px offset). Component-specific rings and `outline-none` MUST be removed. A wrapper may show the ring via `:focus-within` with the same token.
- REQ-0002-23: The notice component MUST render every kind (ok, warning, error) as the same box shape with an icon and text, so a notice's kind is never conveyed by color alone.
- REQ-0002-24: Each step's `h1` MUST be the step's name ("Setup", "At the table", "Cash out", "Settle up"). "Chip Ledger" MUST appear as non-heading brand text in the page header on every step (REQ-0002-28), not inside `main`. The error and not-found pages MUST reuse the page-title component.
- REQ-0002-25: Bottom-bar buttons MUST follow one rule: a secondary back button labelled "‹ <previous step>" and a primary forward button labelled with its action. The accessible name of "‹" buttons MUST be "Back to <step>".
- REQ-0002-26: Components MUST NOT use one-off sizes (`w-23`, `h-42.5`, `size-13`, `py-1.75`, `w-9.5`, `max-w-[40ch]`, `grid-cols-[1fr_auto]`). Each MUST become a token or an existing scale step, documented in [Design System](../../DESIGN_SYSTEM.md).

### Visual polish (P3 review)

Added after the owner's review of the Phase 3 preview.

- REQ-0002-27: The step navigation MUST read as a progress stepper: an ordered list of numbered circles joined by a line that is filled up to the current step. Done steps show a check mark, the current step is a filled circle with a halo and a bold label, and later steps are outlined. Circles MUST be at least 3:1 against the page, and in forced-colors mode the three states MUST stay distinct.
- REQ-0002-28: A single page header (`banner` landmark) MUST show the brand mark and "Chip Ledger" above the step navigation on every step, so the content starts at the same height on every step and nothing jumps when the step changes. Setup MUST NOT have extra artwork or a second brand line above its title.
- REQ-0002-29: The app MUST ship an SVG favicon and a 180 px home-screen icon, drawn from the same multi-colored chip mark as the header, in the chip artwork colors.
- REQ-0002-30: Every step's top section MUST use the same spacing tokens: the header's top padding, then the title, intro, and section headings with consistent space above and below.
- REQ-0002-31: Fields, buttons, and notices MUST each have one look that the other two never share. Text fields, selects, and the stepper share one field box (48 px, `--radius-md`, `--color-border-control` border, surface). Buttons are pills (`--radius-full`) filled with accent (primary), a soft accent tint (secondary), or a soft danger tint (danger); only the outline variant has a border. Notices are tinted panels with a 4 px colored rule on the left and no full border. Text on every tint MUST stay at least 4.5:1 in both themes.
- REQ-0002-32: Selects MUST draw their own chevron inside the field box, at a fixed inset from its right edge, instead of the browser's arrow.

## 5. Acceptance criteria

- AC-0002-01 (REQ-0002-01): Given 20 USD and its default chips, when the host opens Cash out, then each card shows the visible text "White", "Red", and "Blue" beside the matching inputs, and `getByLabel("Red chips for Ana")` still finds the red input.
- AC-0002-02 (REQ-0002-02): Given Setup with a valid buy-in, when the host presses Enter on "Start the game", then `document.activeElement` is the `h1` "At the table" and `document.title` is "At the table · Chip Ledger". Pressing Tab next reaches the step's first control (the step navigation comes before the title in reading order), not the skip link.
- AC-0002-03 (REQ-0002-03): Given photo counting on, after one photo for Ana, the control's accessible name is "Retake photo of Ana's chips".
- AC-0002-04 (REQ-0002-04): Given the host is on Cash out, then "1 Setup" and "2 Table" show a check mark and their accessible names end in "(done)"; "4 Settle" does not. A contrast check of the done circle against `--color-bg` reports ≥ 3:1 in light and dark.
- AC-0002-05 (REQ-0002-05): Given Setup, then the visible texts "Player 1 name", "Buy-in", "Currency", "Color", "Per player", and "Value" are shown, and the first chip row's select is named "White chip color".
- AC-0002-06 (REQ-0002-06): Given the clipboard rejects, when the host presses "Copy results", then the text area's computed border color equals `--color-border-control`.
- AC-0002-07 (REQ-0002-07): Given Setup with 4 players, when the host presses "More players", then the live region reads "5 players". Typing "2", "25", "250" into the buy-in updates the region at most once per change of summary kind.
- AC-0002-08 (REQ-0002-08): Given the buy-in is cleared, then "Start the game" is focusable, has `aria-disabled="true"`, and its description contains "Enter a buy-in amount."; activating it moves focus to the buy-in field, which has `aria-invalid="true"`.
- AC-0002-09 (REQ-0002-09): Given the visual test emulates `forced-colors: active`, then the current step, done steps, and primary button edges are visible in the snapshot.
- AC-0002-10 (REQ-0002-10): Given a 375 × 400 px viewport on Setup, then the bottom bar is not `position: fixed`; given 375 × 812 px, when focus moves to the last chip row's value field, then the field's bounding box is fully above the bar.
- AC-0002-11 (REQ-0002-11): Given Settle, when the host presses "Start over from scratch", then the confirmation is shown with focus on "Cancel"; `Esc` closes it and focus returns to "Start over from scratch"; "Erase everything" resets to defaults on Setup.
- AC-0002-12 (REQ-0002-12): Given Settle, then the bottom bar shows "‹ Cash out" and "New game, same players"; pressing the primary opens Table with every player at 1 buy-in and names kept.
- AC-0002-13 (REQ-0002-13): Given Table with Ana at 1 buy-in, when the host presses "Remove a buy-in for Ana", then Ana has 0 and that button is disabled.
- AC-0002-14 (REQ-0002-14): Given the SHORT_COUNTS fixture, then the mismatched white row shows visible text "short" next to "<counted> of <issued>".
- AC-0002-15 (REQ-0002-15): A text search of `app/` and `lib/summaries.ts` for user-facing "Tap" returns no matches.
- AC-0002-16 (REQ-0002-16): Computed font size is ≥ 15 px for step buttons, hints, and chip-row summaries, and ≥ 14 px for the footer.
- AC-0002-17 (REQ-0002-17): Given a desktop viewport, hovering the primary button changes its background to `--color-accent-hover`.
- AC-0002-18 (REQ-0002-18): Given the buy-in is cleared, the "Start the game" text on its disabled background measures ≥ 3:1 in both themes.
- AC-0002-19 (REQ-0002-19, -20, -21, -23): Component tests render the stepper, card, row, notice, and outline button, and the Setup player count and Table counters render the same stepper markup.
- AC-0002-20 (REQ-0002-22): A static check finds no `outline-none`, `focus:outline-none`, or `focus-within:ring` classes under `app/`.
- AC-0002-21 (REQ-0002-24): Given each step, the `h1` text is that step's name, and "Chip Ledger" is non-heading text in the page header, not in `main`.
- AC-0002-22 (REQ-0002-25): Given Table, the bottom bar's buttons are named "Back to Setup" (visible "‹ Setup") and "Cash out".
- AC-0002-23 (REQ-0002-26): A text search of `app/` for the listed one-off classes and for `-[` arbitrary values returns no matches.
- AC-0002-27 (REQ-0002-27): Given Table, the navigation is a list of four items whose circles read ✓, 2, 3, 4; circle 2 is filled with a halo, circles 3 and 4 are outlined, and only the line into step 2 is filled. A contrast check of the accent and control-border colors against `--color-bg` reports ≥ 3:1 in both themes, and the forced-colors snapshot shows the three states.
- AC-0002-28 (REQ-0002-28): Given each step, the page has exactly one `banner` containing "Chip Ledger" and the step navigation, and `main`'s top edge is at the same height on every step.
- AC-0002-29 (REQ-0002-29): The page links an `image/svg+xml` icon and a 180×180 `apple-touch-icon`, and both URLs serve their image types.
- AC-0002-30 (REQ-0002-30): The visual snapshots of every step show the same header and title spacing.
- AC-0002-31 (REQ-0002-31): Component tests find `rounded-full` on every filled and outline button variant and never the field border; the field box and the stepper share `h-12`, `rounded-md`, and `border-border-control`; notices have `border-l-4` and no full border. A contrast check of text on the accent-soft, danger-soft, and success tints reports ≥ 4.5:1 in both themes.
- AC-0002-32 (REQ-0002-32): The currency and chip-color selects have `appearance-none` and a decorative chevron positioned inside the box, and are still named list boxes.
- AC-0002-24 (all): axe reports no WCAG 2.1 A/AA violations on every step and new state (confirmation open, aria-disabled start) in light and dark, and a keyboard-only walkthrough Setup → Settle → New game passes.

## 6. Cross-cutting concerns

- **Accessibility:** The purpose of this spec. Manual checks to record in the PR: VoiceOver (iOS Safari) and NVDA (Firefox) walkthrough; keyboard only; 200% zoom and 320 px reflow; Windows forced colors (or Chromium emulation); a color-vision-deficiency simulation (deuteranopia, protanopia) of Cash out.
- **Security:** N/A: no new input, endpoint, storage, or header change. The CSP is unaffected (no inline styles; `document.title` is set from constants).
- **Privacy:** N/A: no new data collected or stored.
- **Performance:** No new dependency. Expected bundle change under 2 kB gzip. Lighthouse budgets in `sdd.yaml` still apply.
- **Error states:** Unchanged. The error and not-found pages only reuse the page-title component (REQ-0002-24).
- **i18n / localization:** N/A: OPT-I18N not adopted. The new strings are English, and step titles in `document.title` come from the same constants as the headings.
- **SEO:** The served `<title>` stays "Chip Ledger …" for crawlers. REQ-0002-02 changes the title only on the client after a step change.

## 7. Open questions

All resolved by the owner on 2026-10-30.

- Resolved: Settle's primary action is "New game, same players" (REQ-0002-12).
- Resolved: the reset confirmation stays inline in the page, not a modal dialog (REQ-0002-11).
- Resolved (delegated to the author and decided on best practice): chip rows get one visible header row rather than a label above each field (REQ-0002-05). Reasons: the rows are a repeated grid of the same three fields, which is the case column headers are made for. The header text is contained in each field's accessible name ("Value" ⊂ "White chip value"), so WCAG 2.5.3 holds. Rows stay about 20 px shorter, which keeps the starting stack in view at 320 px. The header row is hidden from assistive technology (`aria-hidden`), so names are not read twice. Fallback: if the 320 px or 200% zoom check in T-08 shows the columns no longer line up under the headers, switch to per-field labels.
- Resolved: visual baselines are refreshed in each phase's PR (P1, P2, P3), not once at the end.

## 8. References

- Manual audit, 2026-10-30. Findings are mapped to requirements in [plan.md §1](./plan.md).
- WCAG 2.1: 1.3.1, 1.4.1, 1.4.3, 1.4.10, 1.4.11, 2.4.2, 2.4.3, 2.4.7, 2.5.3, 3.3.1, 3.3.2, 4.1.3.
- [Accessibility](../../ACCESSIBILITY.md) · [Design System](../../DESIGN_SYSTEM.md) · [SPEC-0001](../0001-chip-ledger/spec.md)
