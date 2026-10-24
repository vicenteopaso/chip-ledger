# Contributing

Thanks for helping. This project is **spec-driven**: intent is written down, reviewed, and checked before and alongside code. The rules apply equally to people and AI agents.

## Prerequisites

- Node.js — version in [`.nvmrc`](./.nvmrc)
- pnpm via Corepack: `corepack enable`

## Quick start

```bash
pnpm install
pnpm dev
pnpm verify     # full local verification; mirrors CI
```

## Workflow

1. **Pick a tier.** See [SDD Guide §3](./docs/SDD_GUIDE.md): Tier 0 (typos, patch bumps), Tier 1 (behavior change), Tier 2 (architecture, security model, public API).
2. **Specify first (Tier 1–2).** Copy `docs/specs/_template/` to `docs/specs/NNNN-slug/` and get the spec reviewed. Tier 2 also needs a plan and an ADR.
3. **Branch** from `main`: `feat/…`, `fix/…`, `docs/…`, `chore/…`. Never commit to `main`.
4. **Implement** in small commits with tests. Cite requirement IDs in test names.
5. **Verify** locally: `pnpm verify` and `node scripts/check-sdd-refs.mjs && node scripts/check-doc-links.mjs`.
6. **Open a PR** using the template. Title: `type: summary`. Explain what **and why**. Link the spec/ADR. List any skipped checklist item with the reason.
7. **Review** against the [Review Checklist](./docs/REVIEW_CHECKLIST.md). Address comments with new commits; squash on merge.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `ci:`, `chore:`. Atomic, imperative, explains why when not obvious. AI-assisted commits keep the `Co-Authored-By` trailer your tool adds.

## Commands

| Command            | Purpose                       |
| ------------------ | ----------------------------- |
| `pnpm dev`         | Dev server                    |
| `pnpm build`       | Production build             |
| `pnpm lint`        | Lint                          |
| `pnpm typecheck`   | TypeScript                    |
| `pnpm test`        | Unit and component tests      |
| `pnpm coverage`    | Tests with coverage thresholds |
| `pnpm test:e2e`    | End-to-end tests              |
| `pnpm test:visual` | Visual regression             |
| `pnpm test:a11y`   | Accessibility audits          |
| `pnpm verify`      | Everything CI runs            |

The authoritative list is `sdd.yaml` → `devex.commands`.

## What CI enforces

`pr-template-check`, `test-coverage-check`, `sdd-check`, `audit-secrets`, `verify`, `test-e2e`, `test-a11y`, `codeql`, `lighthouse`. Details in [AI Guardrails §8](./docs/AI_GUARDRAILS.md). Don't bypass hooks (`--no-verify`) or gates; fix the cause.

## Definition of done

- Acceptance criteria demonstrated, with evidence
- Tests added; lint, typecheck, tests pass
- Docs, `sdd.yaml`, `.env.example` updated where behavior or config changed
- Accessibility preserved (WCAG 2.1 AA)
- No secrets, no dead code, no unrelated changes

## Security and conduct

- Report vulnerabilities privately: see [`SECURITY.md`](./SECURITY.md). Never open a public issue for one.
- Be respectful: [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).

## Working with AI agents

Point your agent at [`AGENTS.md`](./AGENTS.md). You are accountable for what it produces: read every line, run the checks, and verify claims before opening the PR.
