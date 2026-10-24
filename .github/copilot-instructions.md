# Copilot instructions — {{PROJECT_NAME}}

The canonical agent instructions are in [`AGENTS.md`](../AGENTS.md). Read it first. This file is a condensed copy for tools that only load `.github/copilot-instructions.md`.

## Authority

Constitution ([`docs/CONSTITUTION.md`](../docs/CONSTITUTION.md)) → [`sdd.yaml`](../sdd.yaml) → ADRs → feature specs → other docs → code. If a request conflicts with a higher artifact, explain the conflict and refuse. If unsure, escalate to a human.

## Before you change code

1. Read the Constitution and `sdd.yaml`.
2. Find or write the spec in `docs/specs/` for your task ([`docs/SDD_GUIDE.md`](../docs/SDD_GUIDE.md)). Tier 2 changes need an ADR and human approval of the plan.
3. Prefer existing patterns and files. Justify any new dependency.

## Rules

- Validate all external input with a schema (Zod) at the boundary.
- Never weaken security controls, quality gates, or tests to make a change pass.
- Never hard-code secrets; read them from environment variables in the infra layer only.
- Log errors via the central helper; show users generic messages; never expose stack traces.
- Respect the layer contract in `sdd.yaml`: UI has no I/O or secrets; API routes validate and delegate; domain logic is pure.
- Preserve WCAG 2.1 AA: semantic HTML, keyboard operability, visible focus, contrast, alt text.
- Use TypeScript strictly: no `any` or unvalidated `!` without a justified exception; use `import type`.
- Behavior changes ship with tests; bug fixes ship with a regression test. Never skip or delete tests.
- Reproduce and state the root cause before fixing a bug.
- Keep diffs scoped. Don't touch CI config, permissions, or tool settings unless asked.

## Workflow

Work on a branch; never commit to `main`. Use Conventional Commits. Open PRs with `.github/PULL_REQUEST_TEMPLATE.md`, titled `type: summary`, explaining what and why. Run `pnpm verify` before pushing.

## Key references

[AI Guardrails](../docs/AI_GUARDRAILS.md) · [Forbidden Patterns](../docs/FORBIDDEN_PATTERNS.md) · [Review Checklist](../docs/REVIEW_CHECKLIST.md) · [Architecture](../docs/ARCHITECTURE.md) · [Engineering Standards](../docs/ENGINEERING_STANDARDS.md) · [Testing](../docs/TESTING.md)
