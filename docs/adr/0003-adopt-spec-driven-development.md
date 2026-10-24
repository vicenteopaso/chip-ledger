# ADR-0003: Adopt spec-driven development

|                |                                    |
| -------------- | ---------------------------------- |
| **Status**     | Accepted                           |
| **Date**       | {{YEAR}}-01-01                     |
| **Deciders**   | {{GITHUB_OWNER}}                   |
| **Area**       | Process, governance                |
| **Related**    | ADR-0001, ADR-0002                 |

## Context and problem statement

Intent lives in people's heads, tickets, and chat threads; code is the only durable artifact, and it records _what_, not _why_ or _what was meant_. AI agents amplify the problem: they implement whatever the prompt says, quickly, and drift from earlier intent. We need a durable, reviewable statement of intent that precedes code and stays consistent with it.

## Decision drivers

- Reviewable intent before expensive implementation
- Traceability from requirement to test
- A hierarchy that resolves conflicts predictably
- Machine-checkable where possible

## Considered options

1. **Layered SDD:** Constitution → `sdd.yaml` → ADRs → feature specs → docs → code, with change tiers
2. Tickets and PR descriptions only
3. Heavyweight up-front design documents for everything
4. Tests as the only specification (BDD-only)

## Decision

**Chosen option:** Layered SDD ([SDD Guide](../SDD_GUIDE.md)).

- Precedence is fixed and written in the Constitution.
- Changes are tiered (0–2) so small work stays light and risky work gets a spec, plan, and ADR.
- Requirements carry IDs that tests cite.
- `sdd.yaml` is schema-validated and cross-checked in CI, including a mapping from every Constitution invariant to its enforcement.

### Consequences

**Positive**

- Disagreements are resolved by precedence, not volume.
- Agents get unambiguous context and a stop point (clarify before plan).
- Drift becomes visible: tests, specs, and `sdd.yaml` can be compared mechanically.

**Negative**

- More documents to write and keep current.
- Risk of ceremony on small changes if tiers are ignored.

**Neutral / to monitor**

- Spec freshness; average time from spec to merge; share of PRs that cite a spec.

## Validation

- `sdd-check` passes on every PR.
- Tier 1–2 PRs link a spec; spec statuses match reality at each release.

## Pros and cons of the options

### 1. Layered SDD

- Good: clear authority, traceability, scales with risk. Bad: process overhead.

### 2. Tickets and PRs only

- Good: no extra artifacts. Bad: intent is scattered and not versioned with code.

### 3. Heavyweight design docs

- Good: thorough. Bad: slow, stale quickly, over-applied.

### 4. Tests as the only spec

- Good: executable. Bad: poor for rationale, non-functional requirements, and early review.

## References

- [SDD Guide](../SDD_GUIDE.md) · [Constitution](../CONSTITUTION.md) · `sdd.yaml`
