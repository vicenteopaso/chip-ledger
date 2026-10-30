# SPEC-0004: Money in per player, and chip sales between players

| Field   | Value                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| Status  | draft                                                                                  |
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
- REQ-0004-02: A player's money in MUST equal their buy-ins times the buy-in, plus the net of sales to them minus sales by them.
- REQ-0004-03: Editors MUST be able to record a sale: a seller, a different buyer, and an amount greater than zero. It MUST reduce the seller's money in and raise the buyer's by the same amount, so the pot is unchanged.
- REQ-0004-04: A sale MUST NOT take the seller's money in below zero; the form MUST say why when it is refused.
- REQ-0004-05: Settle MUST use each player's money in (REQ-0004-02) as the amount put in, so sales need no separate payment.
- REQ-0004-06: The pot MUST still equal the sum of every player's money in. Adding or removing a buy-in with the existing steppers MUST keep working and MUST change the pot as before.
- REQ-0004-07: The table MUST list the recorded sales ("Ana sold Ben 5.00 euros") and editors MUST be able to remove one; removing a sale restores both amounts.
- REQ-0004-08: In shared games a sale and its removal MUST sync like any other edit (queued offline, idempotent, announced once to other devices: "Ana sold Ben 5.00 euros, pot unchanged").
- REQ-0004-09: Watchers MUST see amounts and the sales list, and MUST NOT see the form or the remove buttons.
- REQ-0004-10: Games saved or shared before this change MUST open unchanged, with no sales and the same amounts as before. Solo saved games, shared games and the game's JSON shape stay valid (SPEC-0001 REQ-0001-25).
- REQ-0004-11: The sale form MUST be keyboard operable, labelled, and announce the result; refused sales MUST be explained in text, not by color alone (WCAG 2.1 AA).
- REQ-0004-12: A game MUST hold at most 100 sales; the server MUST validate sales with the same schema as the client (CONSTITUTION: validate external input).

## 5. Acceptance criteria

- AC-0004-01 (REQ-0004-01): Given a 4-player game with a 20.00 buy-in, when the table opens, then each row shows "€20.00 in" large and "1 buy-in" small.
- AC-0004-02 (REQ-0004-02, -03): Given Ana has 20.00 in and Ben 20.00, when Ana sells Ben 5.00, then Ana shows 15.00, Ben 25.00 and the pot is unchanged.
- AC-0004-03 (REQ-0004-04): Given Ana has 15.00 in, when someone records a sale by Ana of 20.00, then it is refused with a message, and nothing changes.
- AC-0004-04 (REQ-0004-05): Given the sale in AC-0004-02 and equal final chip values, when Settle runs, then Ana and Ben are each settled against 15.00 and 25.00 and no separate 5.00 payment appears.
- AC-0004-05 (REQ-0004-07): Given a recorded sale, when an editor removes it, then both amounts return to what they were.
- AC-0004-06 (REQ-0004-08): Given two devices on one shared game, when one records a sale, then the other shows it within the normal sync time and announces it once.
- AC-0004-07 (REQ-0004-10): Given a game saved before this change, when it loads, then the table shows the same amounts as before and no sales.
- AC-0004-08 (REQ-0004-09): Given a watcher link, when the table opens, then there is no form and no remove button.
- AC-0004-09 (REQ-0004-06): Given a sale, when an editor adds a buy-in to Ben, then the pot rises by one buy-in and Ben's amount is 25.00 plus one buy-in.

## 6. Cross-cutting concerns

- **Accessibility:** a "Sell chips" button opens an inline form (seller, buyer, amount) in the same style as the other inline forms; focus moves to the first field, returns to the button on save or cancel; result announced in the live region; amounts have text, not color alone. Axe in both themes, mobile and desktop.
- **Security:** a new allowed action in the shared-game allowlist (`recordSale`, `removeSale`), validated by the same schema on server and client; the server applies it with the same reducer; body caps still hold; no new endpoint, no new secret.
- **Privacy:** N/A: no personal data beyond the player names already stored.
- **Performance:** one extra list on the table; no bundle or API change worth a budget.
- **Error states:** refused sales are explained in the form; a sale that loses a race in a shared game (the seller's amount dropped meanwhile) is rejected by the server and shown with the existing "not saved" notice.
- **i18n / localization:** amounts use the game's currency and the existing money formatter.
- **SEO:** N/A: no public page.

## 7. Open questions

- [NEEDS CLARIFICATION: Sale list: show every sale as its own line (the proposal), or only the net per player?]
- [NEEDS CLARIFICATION: Name: "Sell chips", "Chip sale" or "Transfer"? Proposal: "Sell chips" on the button, "Ana sold Ben 5.00" in the list.]
- [NEEDS CLARIFICATION: Should Settle's summary mention that sales were included ("Includes 2 chip sales")? Proposal: yes, one line.]
- [NEEDS CLARIFICATION: Should an amount be limited to the seller's current money in (proposal, REQ-0004-04), or allowed to go below zero when someone sells more chips than they put in (they won chips from others)? This matters for a big winner selling on.]

## 8. References

- SPEC-0001 (table, settle, saved game shape), SPEC-0003 (shared games, allowed actions), `lib/game.ts` (`pot`, `totalBuyins`), `lib/settlement.ts` (`putIn`), `lib/game-reducer.ts`.
