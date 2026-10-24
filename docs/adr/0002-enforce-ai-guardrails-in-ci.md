# ADR-0002: Enforce AI guardrails in CI

|                |                                    |
| -------------- | ---------------------------------- |
| **Status**     | Accepted                           |
| **Date**       | {{YEAR}}-01-01                     |
| **Deciders**   | {{GITHUB_OWNER}}                   |
| **Area**       | CI, quality assurance              |
| **Related**    | ADR-0001                           |

## Context and problem statement

Reminders in documentation do not stop a rushed or automated change. Without machine-enforced gates, AI-generated (and human) changes can land without tests, without recorded rationale for architectural choices, or without the checklist review that catches accessibility, security, and error-handling gaps.

## Decision drivers

- Consistency: every PR meets the same bar.
- Fast, early feedback at PR time rather than after merge.
- Low friction for trivial changes; strict where risk is high.

## Considered options

1. **CI guardrails:** test-change check, PR template check, ADR-link check, plus the existing test and security gates
2. Manual code review only
3. Post-merge quality checks
4. Lint and typecheck only
5. Require 100% coverage

## Decision

**Chosen option:** CI guardrails.

- `scripts/check-pr-tests.mjs`: changes under configured code paths require changes under test paths (or colocated tests). Docs-only changes pass.
- `scripts/check-pr-body.mjs`: PR title follows `type: summary`; the PR body contains every section heading in `.github/PULL_REQUEST_TEMPLATE.md`; `architecture-change` PRs link an ADR. The required sections are read from the template itself so the check cannot drift from it.
- Existing gates (lint, typecheck, coverage thresholds, e2e, a11y, CodeQL, secret scan, dependency audit) are required status checks.
- An emergency bypass for the test check (`SKIP_TEST_CHECK=true`) exists but requires a written justification in the PR.

### Consequences

**Positive**

- Predictable, transparent expectations for every contributor and agent.
- Architectural decisions are recorded; regressions are caught before merge.

**Negative**

- Small changes need test updates, which can feel heavy for pure refactors.
- Scripts must be maintained as the repository layout evolves.
- Presence of tests does not prove quality; human review still matters.

**Neutral / to monitor**

- False positives on the test check; tune `CODE_PATHS`/`TEST_PATHS` rather than disabling.

## Validation

- Share of PRs that needed an override stays low; each override is justified in the PR.
- Escaped-defect rate trends down.

## Pros and cons of the options

### CI guardrails

- Good: automatic, early, consistent. Bad: setup and maintenance.

### Manual review only

- Good: flexible. Bad: inconsistent and reviewer-dependent.

### Post-merge checks

- Good: no PR friction. Bad: `main` can break; harder to revert.

### Lint and typecheck only

- Good: fast. Bad: misses behavior, a11y, and visual regressions.

### 100% coverage

- Good: simple target. Bad: gameable and not a quality measure.

## References

- [AI Guardrails](../AI_GUARDRAILS.md) · [Testing](../TESTING.md) · [Review Checklist](../REVIEW_CHECKLIST.md)
