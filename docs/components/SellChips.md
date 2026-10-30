# SellChips

An inline form on "At the table" that records a sale of chips from one player to another for an amount (SPEC-0004). Use it where players pay each other for chips instead of adding a buy-in; it is not for ordinary rebuys.

| Field    | Value                             |
| -------- | --------------------------------- |
| Location | `app/components/SellChips.tsx`    |
| Type     | Client component                  |
| Status   | stable                            |
| Spec     | SPEC-0004 (REQ-0004-03, -07, -11) |

## Props

| Prop       | Type                           | Default | Required | Description                                                 |
| ---------- | ------------------------------ | ------- | -------- | ----------------------------------------------------------- |
| `game`     | `GameState`                    | —       | Yes      | The players, currency and amounts                           |
| `dispatch` | `(action: GameAction) => void` | —       | Yes      | Receives `{ type: "sellChips", sellerId, buyerId, amount }` |

## Usage

```tsx
{
  !readOnly && <SellChips game={game} dispatch={dispatch} />;
}
```

`TableScreen` shows it for everyone who can edit and hides it for a watcher (`ReadOnlyContext`).

## Behavior

- Closed, it is one "Sell chips" button. Open, it shows Seller, Buyer, Amount, "Record sale" and "Cancel".
- Seller and buyer must be different players; the amount must be greater than zero in the currency's smallest unit. Otherwise the form says why in text and records nothing.
- A seller's money in may go below zero (a player who won chips can sell more than they bought in).
- The pot never changes: the seller's money in goes down by the amount and the buyer's goes up by the same amount (`moved` on each player, see [ARCHITECTURE](../ARCHITECTURE.md#5-data-and-contracts)). A mistaken sale is fixed with the reverse sale.

## Accessibility

- Opening moves focus to Seller; recording or cancelling returns it to "Sell chips". `Esc` cancels.
- Every field has a visible label; a refusal is a `role="alert"` message next to the fields, and the amount is marked `aria-invalid` with `aria-describedby` pointing at it.
- The result is announced in the page's live region ("Chip sale: Ana now $15.00 in, Ben now $25.00 in"), here and on other devices of a shared game.

## Testing

- `test/unit/app/components/SellChips.test.tsx` (form, table rows, Settle note, Setup message)
- `test/e2e/chip-sales.spec.ts`, `test/a11y/screens.spec.ts`, `test/visual/screens.spec.ts`
