# AGENTS.md — chip-ledger

Entry point for AI coding agents (Claude Code, Codex, Cursor, Copilot, and others). Humans: see [`README.md`](./README.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Authority

In case of conflict, higher wins: **Constitution → `sdd.yaml` → ADRs → feature specs → other docs → code.**
If a request conflicts with the Constitution, explain the conflict and refuse. If unsure, ask a human.

## Read first

1. [`docs/CONSTITUTION.md`](./docs/CONSTITUTION.md) — invariants
2. [`sdd.yaml`](./sdd.yaml) — layers, gates, commands, autonomy tiers
3. The spec for your task in [`docs/specs/`](./docs/specs/README.md) — or write one ([`docs/SDD_GUIDE.md`](./docs/SDD_GUIDE.md))
4. [`docs/AI_AGENT_GUIDE.md`](./docs/AI_AGENT_GUIDE.md) and [`docs/AI_GUARDRAILS.md`](./docs/AI_GUARDRAILS.md)
5. The reference doc for the area you touch — [`docs/README.md`](./docs/README.md)

## Workflow

Classify the change tier → specify (Tier 1–2) → plan + ADR (Tier 2, wait for approval) → implement with tests → `pnpm verify` → update docs/`sdd.yaml` → hand off with evidence.

## Commands

```bash
pnpm install        # setup
pnpm dev            # dev server
pnpm verify         # lint + typecheck + coverage + build + e2e (mirrors CI)
pnpm lint && pnpm typecheck && pnpm test
node scripts/check-sdd-refs.mjs && node scripts/check-doc-links.mjs   # governance checks
```

Use the package manager named in `sdd.yaml` (`stack.package-manager`).

## Non-negotiables

- Validate all external input with a schema; return generic errors; log detail server-side.
- Never weaken a security control, quality gate, or test to make a change pass.
- Never commit secrets or push to `main`. Work on a branch; open a PR.
- Respect layer boundaries; keep UI free of I/O and secrets.
- Preserve accessibility (WCAG 2.1 AA): semantic HTML, keyboard, contrast, alt text.
- Behavior changes ship with tests; bug fixes ship with a regression test.
- Keep diffs scoped. Propose unrelated improvements separately.
- Reproduce and state the root cause before fixing a bug.
- Don't present partial or placeholder work as finished; hand off with evidence.

## Ask before

Adding/upgrading dependencies · changing public APIs, data model, or `sdd.yaml` · touching auth, payments, security headers, CI config, or permissions · deleting things you didn't create.

## Handoff format

**Shipped** · **Verified** (commands, screenshots) · **Pending** · **Risks** · **Needs from you**
