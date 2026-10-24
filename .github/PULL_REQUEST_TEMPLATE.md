## Summary

<!--
  What changed and WHY, in a few sentences. Not just what.
  Title format: `type: short summary` where type is one of
  feat, fix, chore, docs, refactor, test, perf, ci.
  Section headings below are checked by CI (pr-template-check); keep them.
  Open with: gh pr create --template .github/PULL_REQUEST_TEMPLATE.md
-->

## Related Issue and Spec

<!-- Fixes #123 · Spec: docs/specs/NNNN-slug/spec.md · "None (Tier 0)" if no spec is needed -->

## Type of Change

<!-- Tick at least one. -->

- [ ] `feat` — new feature or enhancement
- [ ] `fix` — bug fix (includes a regression test)
- [ ] `refactor` — no behavior change
- [ ] `perf` — performance improvement
- [ ] `docs` — documentation only
- [ ] `test` — tests only
- [ ] `ci` / `chore` — tooling, dependencies, configuration

**Change tier** (see [SDD Guide](../docs/SDD_GUIDE.md)): `0` / `1` / `2`

## Architecture Decision Record (ADR)

<!-- Link the ADR for architecture changes: [ADR-NNNN](../docs/adr/NNNN-title.md) -->

**Architecture change?**

- [ ] Yes — `architecture-change` label added and ADR linked above
- [ ] No

## Governance Compliance

- [ ] Complies with the [Constitution](../docs/CONSTITUTION.md)
- [ ] Aligned with [`sdd.yaml`](../sdd.yaml), or updated in this PR
- [ ] Follows [Engineering Standards](../docs/ENGINEERING_STANDARDS.md) and [Architecture](../docs/ARCHITECTURE.md)
- [ ] Spec status and index updated (or no spec needed)
- [ ] Reference docs, component docs, `.env.example`, and `CONFIGURATION.md` updated where relevant

## Quality Checks

- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] `pnpm test` passes; coverage thresholds met
- [ ] Tests added or updated, citing requirement IDs where applicable
- [ ] `pnpm test:e2e` passes (if routing or user flows changed)
- [ ] Visual and accessibility tests updated (if UI changed)
- [ ] Reviewed against the [Review Checklist](../docs/REVIEW_CHECKLIST.md)

## AI Guardrails Compliance

<!-- Required for every PR. AI-assisted work: you are accountable for every line. -->

- [ ] Reviewed [AI Guardrails](../docs/AI_GUARDRAILS.md) and [Forbidden Patterns](../docs/FORBIDDEN_PATTERNS.md)
- [ ] No security control, gate, or test was weakened, skipped, or removed
- [ ] External input validated at the boundary; errors are generic to users and logged server-side
- [ ] No secrets or credentials committed
- [ ] Accessibility preserved (WCAG 2.1 AA): keyboard, focus, contrast, labels
- [ ] Layer boundaries respected; diff is scoped to the request
- [ ] AI-assisted: yes / no — claims in this PR are backed by commands run or screenshots

## Risk and Rollback

<!-- What could go wrong, how you'd notice, and how to revert. "Low risk; revert the PR" is fine when true. -->

## Additional Notes (optional)

<!-- Screenshots or recordings for UI changes, skipped checklist items with reasons, follow-ups. -->
