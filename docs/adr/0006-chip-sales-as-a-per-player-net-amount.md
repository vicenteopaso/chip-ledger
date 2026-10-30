# ADR-0006: Chip sales between players as a per-player net amount

|              |                                                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**   | Proposed                                                                                                                                                                     |
| **Date**     | 2026-10-30                                                                                                                                                                   |
| **Deciders** | @vicenteopaso                                                                                                                                                                |
| **Area**     | data model, domain rules                                                                                                                                                     |
| **Related**  | [SPEC-0004](../specs/0004-chip-sales-between-players/spec.md) · [ADR-0004](./0004-chip-ledger-client-architecture.md) · [ADR-0005](./0005-shared-live-games-architecture.md) |

## Context and problem statement

Money in is today `buyins × buyIn` for every player, and the pot is the sum. At a home game there are no spare chips: a player with a big stack sells chips to a player who is out, for cash. The pot does not grow, but the app can only add a whole buy-in, so the side deals must be sorted out by hand after Settle. [SPEC-0004](../specs/0004-chip-sales-between-players/spec.md) wants the table to show money in as an amount and to record these sales so Settle needs no side payments. That changes the stored game (solo saves and shared games) and the rules in the reducer, so it needs a decision.

## Decision drivers

- Old saved games and shared games must open unchanged (REQ-0004-10, REQ-0001-25).
- The pot must not drift when chips are sold between players.
- One reducer for client and server (ADR-0005); the new action must be small and easy to validate.
- Simple for people: net per player on screen, no ledger to maintain (owner's choice).
- Keep Settle's maths untouched where possible.

## Considered options

1. **A per-player net amount (`moved`, default 0)** — a sale subtracts from the seller and adds to the buyer; money in is `buyins × buyIn + moved`.
2. **A list of sales in the game** — each sale is stored; money in is computed from the list; sales can be removed.
3. **Replace buy-in counts with a free amount per player** — the editor types any amount for anyone.

## Decision

**Chosen option:** "A per-player net amount", because it is one optional number, keeps old games valid by defaulting to zero, makes the pot unable to drift (a sale always moves the same amount from one player to another), and needs no list to display or edit. Fixing a mistake is the reverse sale, and the net line disappears at zero.

### Consequences

**Positive**

- Small schema change (one defaulted field), one new action, Settle changes by one line.
- Works the same in solo and shared games and for watchers.

**Negative**

- No history of who sold what to whom; a mistake is fixed by a reverse sale, not removal. Accepted by the owner.
- Hidden players (fewer than six) can still hold a `moved` amount, so lowering the player count is refused while one does.
- A revert of this change makes older code ignore `moved` in games in progress.

**Neutral / to monitor**

- If people ask for a history later, option 2 can be added on top (store sales, derive `moved`).

## Validation

- Unit tests that the sum of `moved` over active players is zero after any sale, and that old games parse with `moved` 0.
- E2E that two devices agree after a sale, and that Settle shows no separate payment for it.

## Pros and cons of the options

### A per-player net amount

- Good: smallest change, backwards compatible, no drift.
- Bad: no per-sale history.

### A list of sales

- Good: full history; sales can be removed.
- Bad: larger schema and UI, a list to bound and validate on the server, more to announce; the owner did not want it.

### A free amount per player

- Good: most flexible.
- Bad: the pot can drift when two edits do not match; needs warnings; loses the buy-in count.
