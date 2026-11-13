# Feature Specs

One folder per feature or significant change: `docs/specs/NNNN-short-slug/` containing `spec.md`, `plan.md`, and `tasks.md`.

The process is defined in [`../SDD_GUIDE.md`](../SDD_GUIDE.md). Start a new spec by copying [`_template/`](./_template/) (or run `/new-spec` in Claude Code).

## Rules

- Numbers are sequential and never reused. The next number is the highest number in the index below plus one.
- Tier 0 changes (typos, patch bumps, no-behavior refactors) do not need a spec.
- Tier 2 changes also need an ADR; link it from the plan.
- Set the status in the spec header when it changes, and update the index in the same PR.

## Statuses

| Status        | Meaning                                             |
| ------------- | --------------------------------------------------- |
| `draft`       | Being written; open questions allowed               |
| `approved`    | Clarified and reviewed; ready to plan or implement  |
| `implemented` | Shipped; acceptance criteria demonstrated           |
| `superseded`  | Replaced by a later spec (link to it in the header) |

## Index

| #    | Title                                                          | Status      | Tier | Links                                                                                                                                                                                                                          |
| ---- | -------------------------------------------------------------- | ----------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0001 | Chip Ledger — poker buy-in and cash-out tracker                | implemented | 2    | [spec](./0001-chip-ledger/spec.md) · [plan](./0001-chip-ledger/plan.md) · [tasks](./0001-chip-ledger/tasks.md) · [ADR-0004](../adr/0004-chip-ledger-client-architecture.md)                                                    |
| 0002 | Accessibility, UX, and consistency pass                        | implemented | 1    | [spec](./0002-a11y-ux-polish/spec.md) · [plan](./0002-a11y-ux-polish/plan.md) · [tasks](./0002-a11y-ux-polish/tasks.md)                                                                                                        |
| 0003 | Shared live games — QR and links, watch/edit access, live sync | implemented | 2    | [spec](./0003-shared-live-games/spec.md) · [plan](./0003-shared-live-games/plan.md) · [tasks](./0003-shared-live-games/tasks.md)                                                                                               |
| 0004 | Money in per player, and chip sales between players            | implemented | 2    | [spec](./0004-chip-sales-between-players/spec.md) · [plan](./0004-chip-sales-between-players/plan.md) · [tasks](./0004-chip-sales-between-players/tasks.md) · [ADR-0006](../adr/0006-chip-sales-as-a-per-player-net-amount.md) |
| 0005 | Card Room — a new visual identity                              | implemented | 1    | [spec](./0005-card-room-reskin/spec.md) · [plan](./0005-card-room-reskin/plan.md) · [tasks](./0005-card-room-reskin/tasks.md)                                                                                                  |
| 0006 | Shared games that stay shared                                  | approved    | 1    | [spec](./0006-shared-game-reliability/spec.md) · [plan](./0006-shared-game-reliability/plan.md) · [tasks](./0006-shared-game-reliability/tasks.md) · [ADR-0007](../adr/0007-read-limits-per-address-and-game.md)               |
| 0007 | Watch link from any device in the game                         | draft       | 1    | [spec](./0007-watch-link-from-any-device/spec.md) · [plan](./0007-watch-link-from-any-device/plan.md) · [tasks](./0007-watch-link-from-any-device/tasks.md)                                                                    |
| 0008 | Tell people when a new version is out                          | draft       | 1    | [spec](./0008-new-version-notice/spec.md) · [plan](./0008-new-version-notice/plan.md) · [tasks](./0008-new-version-notice/tasks.md)                                                                                            |
