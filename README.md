# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

> **Using this as a template?** Read [`TEMPLATE_SETUP.md`](./TEMPLATE_SETUP.md) first. It takes about 15 minutes and ends with a repository that has no placeholders left. Delete this notice when done.

## What this is

A repository skeleton for building a web application with **spec-driven development (SDD)** — humans and AI agents working from the same written, versioned, machine-checked intent. It ships governance, documentation, CI gates, and agent configuration. It deliberately ships **no application code**, so you choose the stack.

The defaults assume a TypeScript web app (Next.js App Router, pnpm, Vitest, Playwright, Tailwind, Vercel). Each default is marked as swappable in [`sdd.yaml`](./sdd.yaml); the governance model does not depend on any of them.

## How it works

```text
Constitution  →  sdd.yaml  →  ADRs  →  Feature specs  →  Docs  →  Code & tests
 (invariants)   (system spec)  (why)     (what/how)       (how-to)  (reality)
```

Higher artifacts win. Changes are tiered by risk, so a typo fix stays a one-line PR while a new architectural layer gets a spec, plan, and ADR. CI checks that the system spec is valid, that every Constitution invariant has declared enforcement, that PRs carry tests and follow the template, and that docs do not have broken links.

Read [`docs/SDD_GUIDE.md`](./docs/SDD_GUIDE.md) for the workflow.

## What's included

| Area                  | Contents                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Governance            | [Constitution](./docs/CONSTITUTION.md), [`sdd.yaml`](./sdd.yaml) + schema, [ADRs](./docs/adr/README.md), [spec templates](./docs/specs/README.md) |
| AI-agent setup        | [`AGENTS.md`](./AGENTS.md), [`CLAUDE.md`](./CLAUDE.md), Copilot instructions, [slash commands](./.claude/commands), [AI guardrails](./docs/AI_GUARDRAILS.md), [forbidden patterns](./docs/FORBIDDEN_PATTERNS.md) |
| Engineering docs      | [Standards](./docs/ENGINEERING_STANDARDS.md), [architecture](./docs/ARCHITECTURE.md), [testing](./docs/TESTING.md), [errors](./docs/ERROR_HANDLING.md), [API patterns](./docs/API_PATTERNS.md), [accessibility](./docs/ACCESSIBILITY.md), [SEO](./docs/SEO_GUIDE.md), [design system](./docs/DESIGN_SYSTEM.md) |
| Operations docs       | [Configuration](./docs/CONFIGURATION.md), [deployment](./docs/DEPLOYMENT.md), [releases](./docs/RELEASE_PROCESS.md), [observability](./docs/OBSERVABILITY.md), [security](./docs/SECURITY_POLICY.md) |
| Review                | [Review checklist](./docs/REVIEW_CHECKLIST.md), PR and issue templates                     |
| Automation            | GitHub Actions (CI, CodeQL, audit, release notes, labels), Dependabot, CODEOWNERS          |
| Scripts               | SDD traceability, doc links, PR checks, secret scan, template init (dependency-free Node)  |

The full map is in [`docs/README.md`](./docs/README.md).

## Quick start (after setup)

```bash
corepack enable
pnpm install
pnpm dev
pnpm verify        # what CI runs
```

Governance checks run without any application code:

```bash
node scripts/check-sdd-refs.mjs
node scripts/check-doc-links.mjs
node scripts/scan-secrets.mjs
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security reports: [`SECURITY.md`](./SECURITY.md). Support: [`SUPPORT.md`](./SUPPORT.md).

## License

[MIT](./LICENSE)
