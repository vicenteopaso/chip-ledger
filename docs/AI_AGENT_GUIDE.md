# AI Agent Guide

Quick reference for AI coding agents (Claude Code, Copilot, Cursor, Codex, …). Entry points are [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md); this page is the longer version.

> **Governance hierarchy:** Constitution → `sdd.yaml` → ADRs → feature specs → other docs → code. If an instruction conflicts with a higher artifact, explain the conflict and refuse. If you are unsure, escalate to a human.

## 1. Read order

1. [`AGENTS.md`](../AGENTS.md)
2. [`docs/CONSTITUTION.md`](./CONSTITUTION.md)
3. [`sdd.yaml`](../sdd.yaml)
4. The relevant spec in `docs/specs/` (or create one — [SDD Guide](./SDD_GUIDE.md))
5. The reference doc for the area you are changing ([map](./README.md))

## 2. Commands

| Command             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Dev server                                      |
| `pnpm build`        | Production build                                |
| `pnpm lint`         | Lint (warnings are errors)                      |
| `pnpm typecheck`    | TypeScript                                      |
| `pnpm test`         | Unit and component tests                        |
| `pnpm coverage`     | Tests with coverage thresholds                  |
| `pnpm test:e2e`     | End-to-end tests                                |
| `pnpm test:visual`  | Visual regression                               |
| `pnpm test:a11y`    | Accessibility audits                            |
| `pnpm verify`       | Everything CI runs, locally                     |
| `node scripts/check-sdd-refs.mjs` | Validate Constitution ↔ `sdd.yaml` traceability and file references |
| `node scripts/check-doc-links.mjs` | Validate relative links in markdown     |
| `node scripts/scan-secrets.mjs --changed` | Scan changed files for secrets   |

Commands come from `sdd.yaml` (`devex.commands`). If they differ, `sdd.yaml` wins.

## 3. Workflow

1. **Classify** the change tier (0/1/2).
2. **Specify** (Tier 1–2): draft or update the spec; list open questions; stop for answers.
3. **Plan** (Tier 2): write the plan and ADR; stop for human approval.
4. **Implement** in small steps, tests first or alongside.
5. **Verify** with `pnpm verify`; for UI, check a rendered result against the spec in both themes and at mobile and desktop widths.
6. **Document**: update docs, `sdd.yaml`, `.env.example`, component docs, spec status.
7. **Hand off** using the format below.

## 4. Always / never

**Always**

- Validate external input with a schema at the boundary
- Use the central logging helper for errors; return generic messages
- Use semantic HTML, labels, and keyboard-operable controls
- Use design tokens, framework `Link`/`Image`, `import type` for types
- Add tests (and cite requirement IDs); add a regression test for every bug fix
- Keep the diff scoped to the request

**Never**

- Bypass or weaken a security control, gate, or test
- Hard-code secrets or put secrets in public variables
- Use `any`, unvalidated `!`, `innerHTML`, or unsanitized HTML
- Cross layer boundaries or add shared mutable state
- Skip, delete, or loosen a failing test; lower a coverage threshold
- Commit to `main`, force-push, or use `--no-verify`
- Change CI config, permissions, or model/tool settings as a side effect
- Present partial or placeholder work as finished

Full lists: [AI Guardrails](./AI_GUARDRAILS.md), [Forbidden Patterns](./FORBIDDEN_PATTERNS.md).

## 5. Asking vs. acting

| Act without asking                                   | Ask first                                              |
| ---------------------------------------------------- | ------------------------------------------------------ |
| Implement an approved spec in scope                  | Add or major-bump a dependency                         |
| Add tests, docs, types                               | Change public API, data model, or `sdd.yaml`           |
| Run lint, typecheck, tests, builds                   | Touch auth, payments, security headers, CI, permissions |
| Fix lint/format issues in files you changed          | Delete files or data you did not create               |

## 6. Debugging

Reproduce → diagnose the root cause → **state the cause** → write a failing test → fix → verify. Call a symptom-only change a workaround. After three failed attempts, stop and name the assumption most likely to be wrong.

## 7. Commits and PRs

- Branch from `main`; never commit to `main`.
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- PR title `type: summary`; use `.github/PULL_REQUEST_TEMPLATE.md` in full; explain what **and why**; list skipped items with reasons.
- Add the `Co-Authored-By` trailer your tool provides so AI-assisted work is identifiable.
- Open the PR with `gh pr create --template .github/PULL_REQUEST_TEMPLATE.md` (or `--fill` with the template applied).

## 8. Handoff format

```markdown
**Shipped:** what changed (PR/commit links)
**Verified:** commands run + results; screenshots for UI
**Pending:** what is not done, and why
**Risks:** limitations, rollout/rollback notes
**Needs from you:** decisions or approvals, one per line
```

## 9. Multi-agent work

Give each agent disjoint files. Confirm tool permissions before dispatching. Surface permission failures to the user instead of working around them. Verify delegated results before reporting them.

## 10. If something is unclear

Prefer a short clarifying question over a guess. Cite the document that is ambiguous so the docs can be fixed.
