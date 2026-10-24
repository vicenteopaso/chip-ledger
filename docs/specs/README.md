# Feature Specs

One folder per feature or significant change: `docs/specs/NNNN-short-slug/` containing `spec.md`, `plan.md`, and `tasks.md`.

The process is defined in [`../SDD_GUIDE.md`](../SDD_GUIDE.md). Start a new spec by copying [`_template/`](./_template/) (or run `/new-spec` in Claude Code).

## Rules

- Numbers are sequential and never reused. The next number is the highest number in the index below plus one.
- Tier 0 changes (typos, patch bumps, no-behavior refactors) do not need a spec.
- Tier 2 changes also need an ADR; link it from the plan.
- Set the status in the spec header when it changes, and update the index in the same PR.

## Statuses

| Status        | Meaning                                              |
| ------------- | ---------------------------------------------------- |
| `draft`       | Being written; open questions allowed               |
| `approved`    | Clarified and reviewed; ready to plan or implement  |
| `implemented` | Shipped; acceptance criteria demonstrated           |
| `superseded`  | Replaced by a later spec (link to it in the header) |

## Index

| #   | Title | Status | Tier | Links |
| --- | ----- | ------ | ---- | ----- |
|     |       |        |      |       |

_No specs yet. The first one is `0001-…`._
