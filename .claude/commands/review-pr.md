---
description: Review a branch or PR against the repository's governance and checklist
argument-hint: [PR number or branch; defaults to the current branch vs main]
---

Review the change: $ARGUMENTS (default: current branch compared with `main`).

1. Read the diff (`git diff main...HEAD`, or `gh pr diff <n>` for a PR) and the linked spec and ADR, if any.
2. Check it against `docs/CONSTITUTION.md` invariants, the layer contract in `sdd.yaml`, and `docs/REVIEW_CHECKLIST.md`. Cite `CONSTITUTION-NN` and `FP-NN` IDs for violations.
3. Verify claims instead of trusting them: run `pnpm lint`, `pnpm typecheck`, and `pnpm test` (or `pnpm verify`) and report real output.
4. Confirm tests exist for every behavior change, a regression test exists for every bug fix, and no test was skipped or weakened.
5. Check that docs, `sdd.yaml`, `.env.example`, and the spec status were updated where behavior changed.
6. Report findings grouped by severity — **Blocker** (security, accessibility, correctness, missing tests), **Should fix**, **Nit** — each with file and line, the problem, and the fix. Do not edit code unless asked.
7. End with a one-line verdict: approve, approve with changes, or request changes.
