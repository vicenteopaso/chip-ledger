# SPEC-0004: Money in per player, and chip sales between players

| Field   | Value                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| Status  | implemented                                                                            |
| Tier    | 2                                                                                      |
| Owner   | @vicenteopaso                                                                          |
| Created | 2026-10-30                                                                             |
| Related | SPEC-0001 (table, settle), SPEC-0003 (shared games); changes the saved and shared game |

## 1. Problem

At the table, each player shows a buy-in count ("2") and, in small text, the money behind it. In home games there are no spare chips. When someone busts and wants to carry on, a player with a big stack sells them chips for cash, for example 5 euros' worth. Today the app can only add a full buy-in to the pot, which is wrong for this: the pot has not grown, and the players have to remember the side deals and sort them out by hand after Settle.

## 2. Goals and non-goals

**Goals**

- "At the table" shows each player's money in as an amount, with the buy-in count as a smaller secondary line.
- Any editor can record a sale of chips from one player to another for an amount, at the table, in solo and in shared games.
- The pot does not change when chips are sold between players, and Settle already accounts for every sale, so nobody has to settle them separately.
- Works with games already saved or shared (no migration step for people).

**Non-goals**

- A list of individual sales, or removing one (decided: net per player; fix a mistake with the reverse sale).
- Tracking which chips (colors, counts) moved. Only the money moves; the chip count at Cash out is still what decides who wins what.
- Free-typing any player's amount (decided: a transfer is the one way, so the pot cannot drift).
- A host role. Any editor can record a sale, as with every other edit (SPEC-0003).
- Payment methods, or who actually handed over cash.

## 3. User stories

| ID    | Priority | Story                                                                                                                                   |
| ----- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | P1       | As a player, I want to see how much money each person has put in, not only how many buy-ins, so the table matches what we say out loud. |
| US-02 | P1       | As the one keeping the book, I want to record "Ana sold Ben 5 euros of chips" so that Settle needs no side payments for it.             |
| US-03 | P2       | As a player, I want to see the sales so far and undo a mistaken one, so a slip does not spoil the settlement.                           |
| US-04 | P1       | As a watcher on a shared game, I want to see the amounts and sales update live, read-only.                                              |

## 4. Requirements

- REQ-0004-01: Each player's row on "At the table" MUST show their money in as an amount in the game's currency, with the buy-in count as a smaller secondary line.
- REQ-0004-02: A player's money in MUST equal their buy-ins times the buy-in, plus their net chip-sale amount (money received for chips they sold is subtracted; money paid for chips they bought is added).
- REQ-0004-03: Editors MUST be able to record a sale: a seller, a different buyer (both in the game), and an amount greater than zero. It MUST reduce the seller's money in and raise the buyer's by the same amount, so the pot is unchanged.
- REQ-0004-04: A seller's money in MAY go below zero (a player who won chips can sell more than they bought in).
- REQ-0004-05: Settle MUST use each player's money in (REQ-0004-02) as the amount put in, so sales need no separate payment, and MUST say "Includes chip sales" when any player's net sale amount is not zero.
- REQ-0004-06: The pot MUST still equal the sum of every player's money in. The existing buy-in steppers MUST keep working and MUST change the pot as before.
- REQ-0004-07: A player whose net sale amount is not zero MUST show it on the table as a small line ("incl. +5.00 from chip sales"). Sales are NOT listed one by one. A mistaken sale is fixed by recording the reverse sale.
- REQ-0004-08: In shared games a sale MUST sync like any other edit (queued offline, applied once, announced once to other devices, for example "Chip sale: Ana now 15.00 in, Ben 25.00 in").
- REQ-0004-09: Watchers MUST see amounts and the net sale lines, and MUST NOT see the "Sell chips" button or form.
- REQ-0004-10: Games saved or shared before this change MUST open unchanged: same amounts, no net sale amounts. The stored game gains one optional field per player that defaults to zero (SPEC-0001 REQ-0001-25).
- REQ-0004-11: The "Sell chips" form MUST be keyboard operable and labelled, MUST announce its result, and MUST explain a refusal in text (WCAG 2.1 AA).
- REQ-0004-12: The server MUST validate a sale with the same schema as the client; the amount MUST be a finite number within the existing amount limits, and the seller and buyer MUST be different players in the game.
- REQ-0004-13: Lowering the player count MUST be refused while any player who would be dropped has a net sale amount that is not zero, with a message saying why. Starting a new game with the same players MUST clear net sale amounts.

## 5. Acceptance criteria

- AC-0004-01 (REQ-0004-01): Given a 4-player game with a 20.00 buy-in, when the table opens, then each row shows "€20.00 in" large and "1 buy-in" small.
- AC-0004-02 (REQ-0004-02, -03): Given Ana has 20.00 in and Ben 20.00, when Ana sells Ben 5.00, then Ana shows 15.00, Ben 25.00 and the pot is unchanged.
- AC-0004-03 (REQ-0004-04): Given Ana has 20.00 in, when she sells 50.00 of chips, then the sale is accepted and she shows -30.00 in.
- AC-0004-04 (REQ-0004-05): Given the sale in AC-0004-02 and equal final chip values, when Settle runs, then Ana and Ben are settled against 15.00 and 25.00, no separate 5.00 payment appears, and the page says "Includes chip sales".
- AC-0004-05 (REQ-0004-07): Given a sale of 5.00 by Ana to Ben, when Ben sells 5.00 back to Ana, then both net sale lines disappear.
- AC-0004-06 (REQ-0004-08): Given two devices on one shared game, when one records a sale, then the other shows it within the normal sync time and announces it once.
- AC-0004-07 (REQ-0004-10): Given a game saved before this change, when it loads, then the table shows the same amounts as before and no sale lines.
- AC-0004-08 (REQ-0004-09): Given a watcher link, when the table opens, then there is no "Sell chips" button.
- AC-0004-09 (REQ-0004-06): Given a sale, when an editor adds a buy-in to Ben, then the pot rises by one buy-in.
- AC-0004-10 (REQ-0004-13): Given Dee (the 4th player) has a net sale amount of 5.00, when someone lowers the player count to 3, then it is refused with a message and the count stays at 4.
- AC-0004-11 (REQ-0004-12): Given a shared game, when a request sells from a player to the same player, or with a non-number amount, then the server answers with the same generic error as any invalid action and changes nothing.

## 6. Cross-cutting concerns

- **Accessibility:** a "Sell chips" button opens an inline form (seller, buyer, amount) in the same style as the other inline forms; focus moves to the first field and returns to the button on save or cancel; the result is announced in the live region; amounts and the sale lines are text, not color alone. Axe in both themes, mobile and desktop.
- **Security:** a new allowed action in the shared-game allowlist (`sellChips`), validated by the same schema on server and client; the server applies it with the same reducer; body caps still hold; no new endpoint, no new secret.
- **Privacy:** N/A: no personal data beyond the player names already stored.
- **Performance:** one extra list on the table; no bundle or API change worth a budget.
- **Error states:** refused sales and refused player-count changes are explained in text next to the control; a sale that no longer applies when it reaches the server (for example the player count was lowered meanwhile) is rejected and shown with the existing "not saved" notice.
- **i18n / localization:** amounts use the game's currency and the existing money formatter.
- **SEO:** N/A: no public page.

## 7. Open questions

None. Resolved with the owner on 2026-10-30: sales are shown as a net amount per player, not a list; the button is "Sell chips"; Settle says "Includes chip sales"; a seller's money in may go below zero.

## 8. References

- SPEC-0001 (table, settle, saved game shape), SPEC-0003 (shared games, allowed actions), `lib/game.ts` (`pot`, `totalBuyins`), `lib/settlement.ts` (`putIn`), `lib/game-reducer.ts`.
