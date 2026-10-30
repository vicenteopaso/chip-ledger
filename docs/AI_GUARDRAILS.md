# AI Guardrails

The constraints, operating protocol, and quality gates for AI-assisted development in this repository. They apply equally to Claude Code, Copilot, Cursor, and any other agent, and to humans using their output.

> **Supremacy:** AI-generated changes MUST comply with `docs/CONSTITUTION.md` and `sdd.yaml`. If a request conflicts with them, explain the conflict and refuse.

## 1. Principles

1. **AI accelerates; humans decide.** Agents propose and implement within documented boundaries. Architecture, security, auth, payments, and data-integrity changes need explicit human approval (CONSTITUTION-17).
2. **Spec first.** Agents read the relevant spec before coding and update it when reality diverges (CONSTITUTION-02).
3. **Gates are not negotiable.** An agent never disables a check, weakens a test, or lowers a threshold to get green (CONSTITUTION-13, -14).
4. **Evidence over assertion.** "Should work" is not done. Done means tests, typecheck, and — for UI — a rendered result checked against the spec.
5. **Small, reversible steps.** Prefer many reviewable diffs over one sweeping change.

## 2. Agent operating protocol

### 2.1 Load context, in this order

1. `AGENTS.md` (or `CLAUDE.md`) — entry point and commands
2. `docs/CONSTITUTION.md`
3. `sdd.yaml`
4. The feature spec in `docs/specs/` for the work at hand
5. Reference docs relevant to the area (`ARCHITECTURE`, `TESTING`, `ERROR_HANDLING`, `SECURITY_POLICY`, …)

### 2.2 Plan before code

State, briefly: the goal, the change tier (see `docs/SDD_GUIDE.md`), the files you expect to touch, the tests you will add, and anything you will need approval for. For Tier 2 work, stop for human review of the plan before implementing.

### 2.3 Stay in scope

- Keep diffs limited to the request. Do not refactor, reformat, or "improve" unrelated code in the same change.
- Flag opportunistic improvements as a separate suggestion or issue.
- Do not change model or tool selection, CI configuration, or permission scopes as a side effect of another task. Those are explicit, separately requested changes.
- Prefer existing patterns and files over new abstractions. Justify every new dependency.

### 2.4 Debug before you fix

1. Reproduce the failure.
2. Diagnose the true root cause. Verify external constraints directly (API limits, quotas, env schemas, auth scopes) instead of guessing from symptoms.
3. State the diagnosed cause **before** writing the fix. If you cannot confirm it, say so.
4. Add a regression test that fails without the fix.
5. A fix that only treats a symptom (retry around a hard quota, a wider `catch`) is a workaround. Label it as one.

If three attempts in a row have not fixed it, stop iterating. Name the assumption most likely to be wrong and ask one diagnostic question.

### 2.5 Definition of done

A task is complete only when all of these hold, with evidence:

- [ ] Acceptance criteria in the spec are demonstrated
- [ ] Tests added or updated; `pnpm lint`, `pnpm typecheck`, `pnpm test` pass locally
- [ ] For UI: rendered preview or screenshot checked against the spec, element by element, in light and dark themes and at mobile and desktop widths
- [ ] Docs, `sdd.yaml`, `.env.example` updated where behavior or config changed
- [ ] No placeholder or partial work presented as finished. WIP is labelled WIP, with what is missing named

### 2.6 Handoff format

End every task with:

```markdown
**Shipped:** what changed, with PR/commit links
**Verified:** commands run and results; screenshots for UI
**Pending:** what is not done, and why
**Risks:** known limitations, rollout or rollback notes
**Needs from you:** decisions or approvals, one per line
```

## 3. Autonomy tiers

Mirrors `ai-governance.autonomy` in `sdd.yaml`.

| Tier       | Agent may…                                                                                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autonomous | Implement an approved spec within scope; add tests, docs, types; run lint, typecheck, tests, builds                                                                                                |
| Ask first  | Add or major-bump a dependency; change the public API, data model, or `sdd.yaml`; touch auth, payments, security headers, CI config, or permission scopes; delete anything outside its own changes |
| Never      | Weaken a security control, gate, or test; commit secrets; push to `main`; present partial work as finished                                                                                         |

## 4. Hard constraints

### Security (CONSTITUTION-08 to -11)

Agents must never: bypass or remove authentication, rate limiting, bot protection, or origin checks; weaken CSP or security headers; hard-code secrets; render unsanitized HTML; skip schema validation of external input; expose stack traces or internal paths to users.

Agents must always: validate input with a schema at the boundary, read secrets from the environment, sanitize before rendering, route errors through the central logging helper.

### Accessibility (CONSTITUTION-12)

Preserve WCAG 2.1 AA: semantic HTML and heading order, full keyboard operability with visible focus, correct and minimal ARIA, contrast of at least 4.5:1 for body text, alt text on meaningful images (`alt=""` on decorative ones). Never regress one of these to hit a visual or performance goal — fix both.

### Architecture (CONSTITUTION-04 to -07)

Respect the layer contract in `sdd.yaml`. Pure logic in the domain layer; UI stays presentational; API routes validate and delegate; only the infra layer touches secrets and external services. Never introduce shared mutable state across requests.

### Testing (CONSTITUTION-13)

New behavior gets tests; bug fixes get a regression test; tests assert observable behavior, not internals. Never skip or delete a failing test to unblock a merge — fix it, or document why it is deferred with a tracking issue. Do not pad coverage with assertion-free tests.

## 5. Lint-enforced guardrails

Machine enforcement beats reminders. Configure these in your linter (flat ESLint config shown as the default).

| Category      | Rule (typical)                                                                               | Why                                 |
| ------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| Type safety   | `@typescript-eslint/no-explicit-any`, `consistent-type-imports`, `no-non-null-assertion`     | No silent loss of type information  |
| Async safety  | `@typescript-eslint/no-floating-promises`, `no-misused-promises`                             | Unhandled rejections hide failures  |
| Logging       | `no-console` (allow only inside the logging helper and server entry points)                  | Central, structured error reporting |
| Security      | `eslint-plugin-security`, `no-eval`, `no-implied-eval`, `react/no-danger`                    | Injection and XSS classes           |
| Accessibility | `eslint-plugin-jsx-a11y` (recommended + strict where practical)                              | Catch a11y bugs at author time      |
| Architecture  | `no-restricted-imports` or `eslint-plugin-boundaries` mirroring `sdd.yaml` layers            | Enforce CONSTITUTION-04             |
| Imports       | `eslint-plugin-simple-import-sort`, `import/no-cycle`                                        | Deterministic diffs, no cycles      |
| Dead code     | An unused-exports tool such as `knip`                                                        | No dead code accumulates            |
| React         | `react-hooks/rules-of-hooks`, `exhaustive-deps`; no direct `document`/`window` in components | Predictable rendering, SSR safety   |

### Exceptions

Exceptions are rare and always justified in-line. Valid reasons: an untyped third-party library, test utilities, profiled performance-critical code, or a temporary migration with an issue number.

```typescript
// ❌ No justification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widget: any = window.vendor;

// ✅ Rule, reason, and tracking
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- vendor SDK ships no types; wrapper typing tracked in #123
const widget: any = window.vendor;
```

Template: `// eslint-disable-next-line <rule> -- <reason>: <what you tried>. <issue link>`

### Scoped overrides

Relax rules only where the context justifies it, and say so in the config:

- Tests: allow `any` in mocks and DOM globals in assertions.
- Scripts and tool config files: allow `console` and sync filesystem access.
- API route handlers: allow `console.error` only if the central logger cannot be used.

## 6. Runtime assertions

Types vanish at runtime. Use two small helpers for the cases the compiler cannot cover.

```typescript
// lib/assert.ts
export function assertNever(value: never, message?: string): never {
  throw new Error(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invariant violation: ${message}`);
  }
}
```

Exhaustive switches turn a forgotten case into a compile error:

```typescript
function label(status: "draft" | "approved" | "implemented"): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "approved":
      return "Approved";
    case "implemented":
      return "Implemented";
    default:
      return assertNever(status);
  }
}
```

Use `invariant` for preconditions that indicate a programmer error. Never use it for user input; validate that with a schema and return a user-safe error.

## 7. Common pitfalls

1. **Assuming data is present.** Optional chaining that hides `undefined` turns into blank UI. Validate at the boundary and model absence in the type.
2. **Incomplete switches.** Add the `assertNever` default.
3. **Swallowing errors.** An empty `catch` is a defect. Log with context, or handle explicitly, or write one line saying why ignoring is safe.
4. **Missing input validation.** `request.json()` returns untrusted data. Parse it with a schema.

```typescript
// ✅ Boundary pattern
const result = Schema.safeParse(await request.json());
if (!result.success) {
  return Response.json({ error: "Invalid request" }, { status: 400 });
}
```

## 8. CI enforcement

| Gate (job ID)         | Enforces                                                                    |
| --------------------- | --------------------------------------------------------------------------- |
| `pr-template-check`   | Title format; PR body has the template's sections; ADR linked when required |
| `test-coverage-check` | Code changes come with test changes                                         |
| `sdd-check`           | `sdd.yaml` schema; Constitution traceability; internal doc links            |
| `audit-secrets`       | No secret-like strings in tracked files                                     |
| `verify`              | Lint, typecheck, unit tests with coverage thresholds, production build      |
| `test-e2e`            | Critical user flows                                                         |
| `test-a11y`           | Automated accessibility audits                                              |
| `codeql`              | Static security analysis                                                    |
| `lighthouse`          | Performance, accessibility, SEO budgets                                     |

**Auto-merge eligible** (if you enable it): dependency patch/minor updates from the dependency bot with green checks, and docs-only changes. **Always human-reviewed:** security, API, auth, architecture, new dependencies, breaking changes.

## 9. Escalation

| Situation                           | Action                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| CI failure                          | Read the logs, reproduce locally, fix the cause, rerun. Never bypass.                           |
| Security finding                    | Stop. Read `docs/SECURITY_POLICY.md`. Fix, rescan. Document any accepted advisory in that file. |
| Accessibility regression            | Fix with keyboard and screen-reader checks; update a11y and visual tests.                       |
| Architecture violation              | Refactor to the layer contract, or write an ADR and get approval to change it.                  |
| Request conflicts with Constitution | Explain the conflict and refuse; propose a compliant alternative.                               |

**Emergency stop — halt and escalate to the owners listed in `.github/CODEOWNERS` if:** high or critical vulnerabilities are found, a secret appears in a commit, production errors spike after a deploy, or data loss or corruption is possible.

## 10. Subagents and parallel work

- Confirm a subagent has the tool permissions the task requires before dispatching it.
- A subagent failing on permissions is a blocking error to surface to the user, not something to route around silently.
- Give each worker disjoint files. Two writers never touch the same file.
- Verify a worker's claimed result (diff, tests) before reporting it as done.

## 11. Continuous improvement

Guardrails are living rules. When an incident, near-miss, or repeated review comment shows a gap:

1. Fix the immediate problem.
2. Add the rule: a lint check if automatable, else a line in `FORBIDDEN_PATTERNS.md` or `REVIEW_CHECKLIST.md`.
3. If it is an invariant, propose a Constitution amendment.
4. Record why in the PR description or an ADR.

## Related

- [Constitution](./CONSTITUTION.md) · [SDD Guide](./SDD_GUIDE.md) · [Forbidden Patterns](./FORBIDDEN_PATTERNS.md)
- [Review Checklist](./REVIEW_CHECKLIST.md) · [Engineering Standards](./ENGINEERING_STANDARDS.md) · [AI Agent Guide](./AI_AGENT_GUIDE.md)
