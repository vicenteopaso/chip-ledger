# ADR-0001: Adopt Architecture Decision Records

|              |                           |
| ------------ | ------------------------- |
| **Status**   | Accepted                  |
| **Date**     | 2026-01-01                |
| **Deciders** | vicenteopaso              |
| **Area**     | Documentation, governance |

## Context and problem statement

With AI-assisted development and multiple contributors, architectural decisions get made quickly and their reasoning evaporates. Without a record: reviewers see the implementation but not the alternatives; technical debt accumulates without its trade-offs; and later contributors, human or AI, reverse sound decisions because the rationale is lost.

We need a lightweight, searchable, version-controlled way to record decisions together with their consequences.

## Decision drivers

- AI agents need durable context to make informed choices.
- Future maintainers must be able to answer "why was it done this way?".
- The process must add little overhead to everyday work.
- It must fit the documentation-first, spec-driven workflow.

## Considered options

1. **ADRs as markdown in `docs/adr/`**
2. Decisions only in commit messages and PR descriptions
3. One central `ARCHITECTURE_DECISIONS.md` document
4. Rely on code comments

## Decision

**Chosen option:** ADRs in `docs/adr/`, one file per decision, from a shared template, numbered sequentially, linked from PRs, and indexed in `docs/adr/README.md`. PRs labeled `architecture-change` must link an ADR.

### Consequences

**Positive**

- Decisions and their trade-offs are searchable and reviewable alongside code.
- PRs can point at a stable explanation instead of restating it.
- Agents can read ADRs as context before proposing changes.

**Negative**

- Contributors must recognize when a decision deserves an ADR.
- ADRs must be superseded when decisions change, or they mislead.

**Neutral / to monitor**

- Adoption: are architecture PRs linking ADRs? Review quarterly.

## Validation

- `pr-template-check` fails an `architecture-change` PR without an ADR link.
- Reviewers cite ADRs in comments instead of re-litigating settled decisions.

## Pros and cons of the options

### 1. ADRs in `docs/adr/`

- Good: structured, versioned, easy to link, well-known practice.
- Bad: needs discipline; one more step on architectural changes.

### 2. Commit messages and PR descriptions

- Good: zero extra process.
- Bad: hard to search; context scattered; no status or supersession.

### 3. A single decisions document

- Good: one place to look.
- Bad: grows unwieldy; merge conflicts; no per-decision history.

### 4. Code comments

- Good: next to the code.
- Bad: no overview; goes stale; cannot capture cross-cutting choices.

## References

- Michael Nygard, _Documenting Architecture Decisions_
- [SDD Guide](../SDD_GUIDE.md)
