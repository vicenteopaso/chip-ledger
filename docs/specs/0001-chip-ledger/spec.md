# SPEC-0001: Chip Ledger — poker buy-in and cash-out tracker

| Field   | Value                                                                       |
| ------- | --------------------------------------------------------------------------- |
| Status  | approved                                                                       |
| Tier    | 2                                                                           |
| Owner   | @vicenteopaso                                                               |
| Created | 2026-10-24                                                                  |
| Related | [ADR-0004](../../adr/0004-chip-ledger-client-architecture.md), [plan](./plan.md), [tasks](./tasks.md) |

## 1. Problem

Hosts of home poker games track buy-ins, rebuys, and final chip counts on paper, then work out by hand who owes whom. Errors are common when chip values do not divide evenly into the buy-in or when the final count does not match the pot.

A working prototype exists as one self-contained HTML file (`chip-ledger.html`). It has no tests, no validated storage, no layer separation, and accessibility gaps (for example, the photo button cannot be reached with a keyboard). This spec moves the prototype into this repository as a maintained web app **with the same behavior, flow, and look**, held to the repository's standards.

## 2. Goals and non-goals

**Goals**

- Keep every user-visible behavior, string, and visual of the prototype unless a requirement below changes it for a repository standard.
- Rebuild photo counting on an OpenAI-compatible model provider (for example OpenRouter) through a server route, kept disabled and hidden from the UI for now.
- Separate pure game logic (domain) from storage and external services (infra) and from presentation (UI), with tests at each level.
- Validate everything read from outside the app (saved state, photo-count responses).

**Non-goals**

- Accounts, sync across devices, or a server-side datastore.
- Turning photo counting on in production. The feature is built and tested but ships disabled; §7 lists what must exist before it is enabled.
- A visible theme toggle (the prototype has none; the theme follows the system setting).
- Localization beyond the prototype's English strings and browser-locale number formatting.
- Redesigning the UI.

## 3. User stories

| ID    | Priority | Story                                                                                         |
| ----- | -------- | --------------------------------------------------------------------------------------------- |
| US-01 | P1       | As a host, I want to set players, buy-in, and starting chip stacks so the game is configured.  |
| US-02 | P1       | As a host, I want to record rebuys during the game so the pot is always known.                 |
| US-03 | P1       | As a host, I want to enter each player's final chips so their cash-out value is computed.      |
| US-04 | P1       | As a host, I want to see who pays whom, in as few payments as practical, so we can settle.     |
| US-05 | P2       | As a host, I want the game to survive a page reload so I do not lose it mid-game.              |
| US-06 | P3       | As a host, I want to count chips from a photo so I do not count stacks by hand (built, off by default). |
| US-07 | P2       | As a host, I want to copy the results so I can paste them into a group chat.                   |

## 4. Requirements

### Navigation

- REQ-0001-01: The app MUST present four steps — Setup, Table, Cash out, Settle — as a step navigation where any step can be opened at any time; the current step MUST be marked with `aria-current="step"` and earlier steps MUST be shown as done.
- REQ-0001-02: Opening a step MUST scroll to the top of the page; each step MUST show its own bottom action bar with the prototype's buttons.

### Setup

- REQ-0001-03: The host MUST be able to pick 4, 5, or 6 players. Six player slots MUST be kept so names survive switching the count. A blank name MUST display as "Player N" (N is the slot number).
- REQ-0001-04: The host MUST be able to set the buy-in amount (decimal; a comma is accepted as the decimal separator) and the currency (USD, EUR, GBP, CLP). Money MUST be formatted with the browser locale and the chosen currency.
- REQ-0001-05: The host MUST be able to define chip rows (color, count per player, value per chip). Colors MUST be unique across rows and chosen from a fixed palette of ten. "Add a chip color" MUST add the first unused color with count 5 and value 5, and MUST be hidden when all colors are used. Removing a row MUST be disabled when only one row remains. Each row MUST show "N chips worth <money>".
- REQ-0001-28: A "Use one value for all chips" checkbox MUST sit at the top of the chip section, off by default (including for games saved before it existed). Turning it on MUST give every row the first row's value and show a single "Value of every chip" field; editing that field MUST change every row, each row MUST show the shared value as text instead of an input, and "Add a chip color" MUST use the shared value. Turning it off MUST keep the current values and make each row's value editable again. The choice MUST be saved with the game.
- REQ-0001-06: A summary MUST state, in priority order: "Enter a buy-in amount." when buy-in ≤ 0; "Add at least one chip color with a count and a value." when the stack is worth ≤ 0; a confirmation when the stack value equals the buy-in (within half a cent); otherwise a warning that states the stack value, the buy-in, and the cash-out rate as a percentage with one decimal.
- REQ-0001-07: "Start the game" MUST be disabled unless buy-in > 0 and the stack value > 0.

### Table

- REQ-0001-08: Each active player MUST start with 1 buy-in and have +/− controls; buy-ins MUST NOT go below 0. Each row MUST show the money that player put in.
- REQ-0001-09: The pot MUST equal total buy-ins × buy-in, and the screen MUST show the total number of buy-ins.

### Cash out

- REQ-0001-10: Each active player MUST have a card with one count input per chip color. Counts MUST be whole numbers ≥ 0; non-digits MUST be ignored; an empty input MUST mean "not entered" (treated as 0).
- REQ-0001-11: A player's cash-out value MUST be their chip face value × the cash-out rate, where the rate is buy-in ÷ stack value (1 when the stack value is 0).
- REQ-0001-12: A count check MUST list, per color, "<counted> of <issued>" where issued = count per player × total buy-ins, and MUST mark mismatches with more than color alone. A summary MUST confirm when counted value equals the pot, or state the difference and whether it is more or less than the pot.

### Photo counting (built, disabled by default)

- REQ-0001-13: Photo counting MUST be controlled by the server-side flag `PHOTO_COUNT_ENABLED` and MUST be off unless it is exactly `true`. When off, the app MUST NOT render any photo control, photo status, or photo wording: the Setup intro reads "Track buy-ins during the game, count chips at the end, and see exactly who pays whom.", the Cash out intro reads "Type each player's chip counts, then check the count below.", and the photo-count endpoint MUST respond 404. When on, both intros use the prototype's photo wording.
- REQ-0001-14: When on, each card MUST offer "Take photo" (then "Retake photo") that accepts an image from the camera or library and is operable by keyboard. While counting, the control MUST read "Counting…" and be disabled, and a status MUST say "Counting chips. This can take up to a minute." A thumbnail of the chosen photo MUST be shown with alt text "Photo of <name>'s chips".
- REQ-0001-15: The client MUST send the photo and, per chip color, the issued total to `POST /api/photo-count`. The server MUST, in order: reject cross-origin requests (403), rate-limit per client (429 with `Retry-After`), validate the form with a schema (image type JPEG, PNG, WebP, or GIF; at most 8 MB; 1–10 unique palette colors; issued totals 0–10 000 — otherwise 400), build the prompt naming each color and its issued total, call the configured OpenAI-compatible chat-completions API with a 60-second timeout, validate the model's JSON reply against a schema, and return only `{ counts, confidence, note }`.
- REQ-0001-16: The client MUST fill the counts from the reply (rounded, ≥ 0, missing colors as 0) and show the confidence (high/medium/low; anything else is treated as medium) and the reply's note: "Counted from the photo with <confidence> confidence. Check the numbers below. <note>". Low confidence MUST be shown as an error-styled status.
- REQ-0001-17: Failures MUST show a fixed, generic message: rate limited → "Too many requests right now. Wait a minute and try again, or type the counts."; image rejected → "That photo could not be read. Try another shot."; unreadable model reply → "The count came back garbled. Try the photo again."; model refusal → "This photo could not be counted. Try a clearer shot."; anything else → "Photo counting failed. Try again or type the counts." Server errors MUST be logged with a request ID through the central logging helper; the response MUST NOT include upstream detail.

### Settle

- REQ-0001-18: Each player's net MUST be cash-out − money in, in whole cents. When "spread the difference" is on and chips were counted, cash-outs MUST be scaled by pot ÷ counted value and any rounding residue MUST be absorbed by the player with the largest absolute net, so nets sum to zero.
- REQ-0001-19: Payments MUST be computed by repeatedly matching the largest remaining debtor with the largest remaining creditor. With no payments the screen MUST say "Everyone broke even. Nobody owes anything."
- REQ-0001-20: When the counted value differs from the pot, a notice MUST state the difference and offer the "spread the difference" checkbox (on by default). When it is off and payments do not balance, the screen MUST state the unaccounted amount.
- REQ-0001-21: Results MUST list each player's net (with a + sign for gains), money put in, and amount cashed out.
- REQ-0001-22: "Copy results" MUST copy a plain-text summary (date, pot, each net, payments) to the clipboard and change to "Copied"; if the clipboard is unavailable it MUST show the text in a read-only field with "Select the text above and copy it."
- REQ-0001-23: "New game with the same players" MUST reset buy-ins to 1, clear all counts, photos, and statuses, keep names and chip setup, and open Table.
- REQ-0001-24: "Start over from scratch" MUST ask for a second tap ("Tap again to erase everything") before resetting everything to defaults and opening Setup. Leaving the step MUST disarm it.

### Persistence

- REQ-0001-25: Game state MUST be saved in the browser under the key `chip-ledger.v1` after every change, in the prototype's format, and restored on load.
- REQ-0001-26: Saved state MUST be validated against a schema on load; missing, malformed, or invalid state MUST fall back to the defaults (4 players, buy-in 20 USD, spread on, chips white 20 × 0.25, red 10 × 0.50, blue 10 × 1) and the problem MUST be logged. Storage being unavailable MUST NOT break the app.

### Presentation

- REQ-0001-27: The look MUST match the prototype — colors, type (Bricolage Grotesque), spacing, chip artwork, fixed bottom bar — in light and dark themes, following the system color scheme and honoring a `data-theme` attribute on the root element.

## 5. Acceptance criteria

- AC-0001-01 (REQ-0001-01, -02): Given any step, when the host opens "3 Cash out" in the step navigation, then the Cash out heading is shown, that button has `aria-current="step"`, and the page is scrolled to the top.
- AC-0001-02 (REQ-0001-06, -07): Given buy-in 20 and the default chips, then the summary reads "Each starting stack is worth $20.00, matching the buy-in." and "Start the game" is enabled; when buy-in is cleared, it reads "Enter a buy-in amount." and the button is disabled.
- AC-0001-03 (REQ-0001-06): Given buy-in 20 and chips worth 10, then the summary says chips cash out at 200% of their values.
- AC-0001-14 (REQ-0001-28): Given the default chips, when the host checks "Use one value for all chips", then every row is worth 0.25 and the summary reads "The stack adds up to $10.00 but the buy-in is $20.00…"; when the host types 0.5 in "Value of every chip", then every row is worth 0.5 and the stack matches the buy-in; after a reload the box is still checked.
- AC-0001-04 (REQ-0001-08, -09): Given 4 players, when the host taps + for Player 1 twice, then Player 1 shows "$60.00 in", the pot shows "$120.00", and "6 buy-ins so far." is shown; − at 0 buy-ins keeps 0.
- AC-0001-05 (REQ-0001-10 … -12): Given default chips and one buy-in each, when Player 1 enters white 40 and the others enter nothing, then Player 1's card shows "$10.00", White shows "40 of 80", and the summary says the counted chips are "$70.00 less than the $80.00 pot".
- AC-0001-06 (REQ-0001-18, -19): Given 4 players with nets +15, +5, −10, −10 (in currency units), then payments are exactly: largest debtor pays largest creditor first, totalling 20, with no zero-amount payments.
- AC-0001-07 (REQ-0001-18): Given scaling on and a counted value that does not divide evenly, then the nets sum to exactly 0 cents.
- AC-0001-08 (REQ-0001-13): Given `PHOTO_COUNT_ENABLED` unset, when the host opens Cash out, then no "Take photo" control exists, and `POST /api/photo-count` returns 404.
- AC-0001-09 (REQ-0001-15 … -17): Given the flag on and a provider reply whose content is `{"counts":{"white":3.6,"red":-2},"confidence":"weird","note":"Blurry"}`, then white is 4, red is 0, blue is 0, and the status reads "Counted from the photo with medium confidence. Check the numbers below. Blurry"; given a cross-origin request, the server returns 403; given a 9 MB image, 400; given a sixth request within a minute from one client, 429; given an upstream timeout, a generic 500 and one logged error.
- AC-0001-10 (REQ-0001-24): When the host taps "Start over from scratch" once, then the label becomes "Tap again to erase everything" and nothing is erased; a second tap resets to defaults on Setup.
- AC-0001-11 (REQ-0001-25, -26): Given a game in progress on Table, when the page reloads, then Table is shown with the same buy-ins; given `chip-ledger.v1` holds `{"players":"oops"}`, then the defaults load.
- AC-0001-12 (REQ-0001-22): Given clipboard write rejects, when the host taps "Copy results", then a read-only field shows the results text.
- AC-0001-13 (REQ-0001-14, -27): Using only the keyboard, the host can complete Setup → Table → Cash out → Settle (with photo counting on, the photo control is focusable); axe reports no WCAG 2.1 A/AA violations on any step in light or dark theme.

## 6. Cross-cutting concerns

- **Accessibility:** WCAG 2.1 AA. Native buttons, inputs, and selects; every control has a programmatic label; a skip link; one `h1` per step; the photo input stays focusable (the prototype hid it with `display:none`); status text in a polite live region; count mismatches marked with text styling and a visually hidden "(does not match)" label, not color alone; visible focus ring; reduced-motion respected. Known gap, kept for UI parity and flagged as a follow-up: name and chip-count inputs are labelled programmatically (visually hidden `<label>`) rather than with visible labels, as in the prototype.
- **Security:** No auth and no datastore. One server endpoint (`/api/photo-count`), off by default (404). When on: same-origin check, per-client rate limit, schema validation with size and type limits, server-only API key (`PHOTO_COUNT_API_KEY`, read only in `lib/infra`), outbound timeout, schema-validated model reply, generic errors. Saved state is untrusted and schema-validated (CONSTITUTION-10). React escapes all rendered text; no raw HTML. Security headers and a nonce-based CSP are configured (see plan).
- **Privacy:** Player names and chip counts stay in the browser's local storage on the device. When photo counting is on, a photo and the chip color list are sent to the configured model provider only on an explicit user action; the app stores neither, and the thumbnail's object URL is revoked when replaced or on unmount. No analytics or cookies.
- **Performance:** One route; server-rendered shell with a single client island; self-hosted font with `display: swap`; Lighthouse budgets in `sdd.yaml` apply.
- **Error states:** Invalid saved state → defaults (logged). Storage write failure → logged, app keeps working. Photo failures → REQ-0001-17 messages (logged). Render errors → error boundary with a generic message and retry. Misconfiguration (flag on without key or model) → the server fails fast naming the missing variable, never its value.
- **i18n / localization:** N/A: optional invariant OPT-I18N is not adopted; strings are English as in the prototype; numbers use the browser locale.
- **SEO:** Single public page with a unique title, description, canonical URL, Open Graph data, robots, and sitemap via the SEO module.

## 7. Open questions

- Resolved (owner, 2026-10-24): photo counting is rebuilt for an OpenAI-compatible provider and ships disabled and hidden.
- Deferred, blocks enabling photo counting in production: bot protection on the endpoint (for example Turnstile), a rate limiter shared across server instances (the built-in one is per instance), a spend cap on the provider account, and the choice of vision model. Enabling it is a separate, reviewed change.

## 8. References

- Prototype: `chip-ledger.html` and `README.txt` (supplied by the owner, 2026-10-24).
