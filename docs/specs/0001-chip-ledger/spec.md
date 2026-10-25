# SPEC-0001: Chip Ledger — poker buy-in and cash-out tracker

| Field   | Value                                                                       |
| ------- | --------------------------------------------------------------------------- |
| Status  | implemented                                                                     |
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
- REQ-0001-02: Opening a step MUST scroll to the top of the page; each step MUST show its own bottom action bar with the prototype's buttons, except that Settle's second button MUST read "Back to Setup" and open Setup (the first step).

### Setup

- REQ-0001-03: The host MUST be able to set the number of players from 2 to 10 with a − button and a + button on either side of the current number, starting at 4; − MUST be disabled at 2 and + at 10, and the current number MUST be announced to assistive technology. Ten player slots MUST be kept so names survive changing the count. Games saved with fewer slots MUST load, with the missing slots added empty. A blank name MUST display as "Player N" (N is the slot number).
- REQ-0001-04: The host MUST be able to set the buy-in amount (decimal; a comma is accepted as the decimal separator) and the currency (USD, EUR, GBP, CLP). Money MUST be formatted with the browser locale and the chosen currency.
- REQ-0001-05: The host MUST be able to define chip rows (color, count per player, value per chip). Colors MUST be unique across rows and chosen from a fixed palette of ten. "Add a chip color" MUST add the first unused color with count 5 and value 5, and MUST be hidden when all colors are used. Removing a row MUST be disabled when only one row remains. Each row MUST show "N chips worth <money>".
- REQ-0001-29: The chips MUST be pre-populated so that the starting stack is worth exactly the buy-in, and MUST stay so while the host has not edited a chip. While balanced, changing the buy-in or the currency MUST recalculate the chips. The plan MUST use three rows (white, red, blue) with values in the ratio 1:2:4 and about twice as many white as red or blue; the white value MUST be the largest "round" amount (1, 2, 2.5 or 5 times a power of ten, in the currency's smallest unit) that is at most the buy-in ÷ 80 and divides the buy-in exactly, falling back to the smallest unit. The default 10 EUR MUST give white 22 × 0.10, red 13 × 0.20, blue 13 × 0.40, and 20 USD white 20 × 0.25, red 10 × 0.5, blue 10 × 1. In one-value mode the single chip MUST use the same rule with a divisor of 40 (40 × 0.25 for 10 EUR, 40 × 0.5 for 20 USD). Editing any chip count, value, or color, or adding or removing a row, MUST stop the automatic recalculation and show a "Fill the chips to match the buy-in" button that rebalances and resumes it. Games saved before this existed MUST load unbalanced. While balanced, a hint MUST say the chips adjust to the buy-in.
- REQ-0001-30: The currency list MUST offer these common currencies, each with its number of decimal digits and a typical buy-in: USD, EUR, GBP, CAD, AUD, NZD, CHF, JPY, CNY, HKD, SGD, INR, KRW, TWD, THB, MYR, IDR, PHP, VND, MXN, BRL, ARS, CLP, COP, PEN, UYU, SEK, NOK, DKK, PLN, CZK, HUF, RON, TRY, ILS, AED, SAR, ZAR. Changing the currency MUST replace the buy-in with the new currency's typical buy-in only while the buy-in still equals the previous currency's typical one (for example 10 EUR becomes 10,000 CLP, and 20 USD is the typical buy-in in dollar currencies). For currencies without decimals (CLP, JPY, KRW, VND), typed buy-in and chip values MUST ignore separators such as the thousands dot in "10.000", and settlement MUST round to whole units rather than to hundredths.
- REQ-0001-28: A "Use one value for all chips" checkbox MUST sit at the top of the chip section, off by default (including for games saved before it existed), and the choice MUST be saved with the game. When on, the color rows and "Add a chip color" MUST be hidden and replaced by a single row laid out like a color row — a multi-color chip, the text "All colors", count per player, ×, value per chip, and a disabled remove button — starting at the total chips per player across the colors and a value of the stack's value divided by that count, rounded to the cent. Cash out MUST then show one "All colors" count per player (colors no longer matter), with the intro "Type how many chips each player has, then check the count below. Colors don't matter.", and the count check one "All colors" line. When off, the single row MUST be hidden and the color rows shown with their values unchanged.
- REQ-0001-06: A summary MUST state, in priority order: "Enter a buy-in amount." when buy-in ≤ 0; "Add at least one chip color with a count and a value." when the stack is worth ≤ 0; a confirmation when the stack value equals the buy-in (within half a cent); otherwise a warning that states the stack value, the buy-in, and the cash-out rate as a percentage with one decimal.
- REQ-0001-07: "Start the game" MUST be disabled unless buy-in > 0 and the stack value > 0.

### Table

- REQ-0001-08: Each active player MUST start with 1 buy-in and have +/− controls; buy-ins MUST NOT go below 0. Each row MUST show the money that player put in.
- REQ-0001-09: The pot MUST equal total buy-ins × buy-in, and the screen MUST show the total number of buy-ins. The pot MUST be shown as plain summary text (a label and the amount above a rule), not as a filled or bordered box that could be mistaken for a button.

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
- REQ-0001-26: Saved state MUST be validated against a schema on load; missing, malformed, or invalid state MUST fall back to the defaults (4 players, buy-in 10 EUR, spread on, chips balanced for it: white 22 × 0.10, red 13 × 0.20, blue 13 × 0.40) and the problem MUST be logged. Storage being unavailable MUST NOT break the app.

### Presentation

- REQ-0001-27: The look MUST match the prototype — colors, type (Bricolage Grotesque), spacing, chip artwork, fixed bottom bar — in light and dark themes, following the system color scheme and honoring a `data-theme` attribute on the root element.

## 5. Acceptance criteria

- AC-0001-01 (REQ-0001-01, -02): Given any step, when the host opens "3 Cash out" in the step navigation, then the Cash out heading is shown, that button has `aria-current="step"`, and the page is scrolled to the top.
- AC-0001-02 (REQ-0001-06, -07): Given 20 USD and its balanced chips, then the summary reads "Each starting stack is worth $20.00, matching the buy-in." and "Start the game" is enabled; when buy-in is cleared, it reads "Enter a buy-in amount." and the button is disabled.
- AC-0001-03 (REQ-0001-06): Given buy-in 20 and chips worth 10, then the summary says chips cash out at 200% of their values.
- AC-0001-15 (REQ-0001-29): Given 20 USD, when the buy-in becomes 40, then the rows are white 20 × 0.5, red 10 × 1, blue 10 × 2; when it becomes 25, the rows are white 22 × 0.25, red 13 × 0.5, blue 13 × 1 and the summary reads "Each starting stack is worth $25.00, matching the buy-in."; when the host types a different white count, the "Fill the chips to match the buy-in" button appears and the buy-in no longer changes the chips; clicking the button restores a matching stack.
- AC-0001-16 (REQ-0001-30): Given the default 10 EUR, when the host picks CLP, then the buy-in is 10,000 and the rows are white 22 × 100, red 13 × 200, blue 13 × 400, worth exactly $10,000 in pesos; typing "20.000" in the buy-in gives 20000 and rows white 20 × 250, red 10 × 500, blue 10 × 1000; payments in a CLP game are whole pesos.
- AC-0001-14 (REQ-0001-28): Given 20 USD and its balanced chips, when the host checks "Use one value for all chips", then the color rows are hidden, one "All colors" row shows 40 × 0.5, and the summary reads "Each starting stack is worth $20.00, matching the buy-in."; when the value is changed to 1, the summary says the stack adds up to $40.00; when the box is unchecked, the White, Red and Blue rows return with 0.25, 0.5 and 1; on Cash out in this mode, Ana typing 40 in "Chips for Ana" shows $20.00; after a reload the mode is kept.
- AC-0001-04 (REQ-0001-08, -09): Given 4 players, when the host taps + for Player 1 twice, then Player 1 shows "$60.00 in", the pot shows "$120.00", and "6 buy-ins so far." is shown; − at 0 buy-ins keeps 0.
- AC-0001-05 (REQ-0001-10 … -12): Given 20 USD with its balanced chips and one buy-in each, when Player 1 enters white 40 and the others enter nothing, then Player 1's card shows "$10.00", White shows "40 of 80", and the summary says the counted chips are "$70.00 less than the $80.00 pot".
- AC-0001-06 (REQ-0001-18, -19): Given 4 players with nets +15, +5, −10, −10 (in currency units), then payments are exactly: largest debtor pays largest creditor first, totalling 20, with no zero-amount payments.
- AC-0001-07 (REQ-0001-18): Given scaling on and a counted value that does not divide evenly, then the nets sum to exactly 0 cents.
- AC-0001-08 (REQ-0001-13): Given `PHOTO_COUNT_ENABLED` unset, when the host opens Cash out, then no "Take photo" control exists, and `POST /api/photo-count` returns 404.
- AC-0001-09 (REQ-0001-15 … -17): Given the flag on and a provider reply whose content is `{"counts":{"white":3.6,"red":-2},"confidence":"weird","note":"Blurry"}`, then white is 4, red is 0, blue is 0, and the status reads "Counted from the photo with medium confidence. Check the numbers below. Blurry"; given a cross-origin request, the server returns 403; given a 9 MB image, 400; given a sixth request within a minute from one client, 429; given an upstream timeout, a generic 500 and one logged error.
- AC-0001-17 (REQ-0001-03): Given a new game, then "4" is shown between − and +, with four name fields; when the host taps + six times, then 10 is shown, ten name fields appear, and + is disabled; when the host taps − eight times, then 2 is shown and − is disabled; a name typed for Player 7 is still there after going 10 → 4 → 10; a game saved with six slots and 5 players loads with 5 players.
- AC-0001-10 (REQ-0001-24): When the host taps "Start over from scratch" once, then the label becomes "Tap again to erase everything" and nothing is erased; a second tap resets to defaults on Setup.
- AC-0001-11 (REQ-0001-25, -26): Given a game in progress on Table, when the page reloads, then Table is shown with the same buy-ins; given `chip-ledger.v1` holds `{"players":"oops"}`, then the defaults load (10 EUR).
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
