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

| #    | Title                                                          | Status      | Tier | Links                                                                                                                                                                       |
| ---- | -------------------------------------------------------------- | ----------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0001 | Chip Ledger — poker buy-in and cash-out tracker                | implemented | 2    | [spec](./0001-chip-ledger/spec.md) · [plan](./0001-chip-ledger/plan.md) · [tasks](./0001-chip-ledger/tasks.md) · [ADR-0004](../adr/0004-chip-ledger-client-architecture.md) |
| 0003 | Shared live games — QR and links, watch/edit access, live sync | draft       | 2    | [spec](./0003-shared-live-games/spec.md) · [plan](./0003-shared-live-games/plan.md) · [tasks](./0003-shared-live-games/tasks.md)                                            |
