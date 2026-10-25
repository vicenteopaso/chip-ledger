# Architecture Decision Records

ADRs capture significant decisions with their context, alternatives, and consequences, so future contributors (and agents) understand **why** the system is the way it is and do not undo good decisions by accident.

## When to write one

Write an ADR when a decision:

- changes system structure, layer boundaries, or introduces a layer (CONSTITUTION-07)
- adopts or removes a framework, library class, or platform
- affects security, privacy, or performance trade-offs
- breaks or changes a public contract
- amends the Constitution (`constitution-amendment`) or `sdd.yaml` structure
- is the kind of thing you would otherwise explain at length in a PR description

Rule of thumb: if a reviewer might ask "why not X?", write it down. If the decision is a one-line implementation detail, don't.

PRs labeled `architecture-change` MUST link an ADR; `pr-template-check` enforces it.

## How

1. Copy [`0000-adr-template.md`](./0000-adr-template.md) to `NNNN-short-kebab-title.md` using the next free four-digit number. Numbers are never reused.
2. Fill in context, drivers, options (at least two real ones), the decision, and honest consequences.
3. Set `Status: Proposed` and link the ADR in the PR description under _Architecture Decision Record_.
4. Review the ADR together with the code. Change status to `Accepted` on merge.
5. Add a row to the index below.

Keep each ADR to one decision and, ideally, one to two pages.

## Lifecycle

| Status                    | Meaning                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| Proposed                  | Drafted, under review (use in the PR)                             |
| Accepted                  | In effect                                                         |
| Deprecated                | No longer relevant; kept for history                              |
| Superseded by ADR-NNNN    | Replaced; the old ADR links forward, the new one links back       |

Never rewrite an accepted ADR to change the decision. Write a new ADR that supersedes it and update only the old one's status line.

## Index

| ADR                                                | Title                                   | Status   | Date       |
| -------------------------------------------------- | --------------------------------------- | -------- | ---------- |
| [0000](./0000-adr-template.md)                     | ADR template                            | Template | —          |
| [0001](./0001-adopt-architecture-decision-records.md) | Adopt Architecture Decision Records  | Accepted | 2026-01-01 |
| [0002](./0002-enforce-ai-guardrails-in-ci.md)      | Enforce AI guardrails in CI             | Accepted | 2026-01-01 |
| [0003](./0003-adopt-spec-driven-development.md)    | Adopt spec-driven development           | Accepted | 2026-01-01 |
| [0004](./0004-chip-ledger-client-architecture.md)  | Client-side architecture for Chip Ledger | Accepted | 2026-10-24 |

> Template note: ADRs 0001–0003 record decisions inherited from this template. Keep them as your project's history (update the dates), or supersede them as your practice evolves.

## Resources

- Michael Nygard, [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [adr.github.io](https://adr.github.io/)
- Related: [Architecture](../ARCHITECTURE.md) · [SDD Guide](../SDD_GUIDE.md)
