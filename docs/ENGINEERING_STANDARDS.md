# Engineering Standards

The quality bar for this repository. Where `sdd.yaml` is the machine-readable contract, this document explains the intent behind it.

**Keywords.** MUST / MUST NOT are requirements. SHOULD is the default — deviate only with a stated reason. MAY is optional. Items tagged _(web profile)_ apply to public websites and can be removed otherwise.

If a standard here conflicts with the Constitution or `sdd.yaml`, those win.

## 1. Documentation-first and SDD

- Behavior, architecture, and cross-cutting changes MUST be specified before or with the code ([SDD Guide](./SDD_GUIDE.md)).
- Docs MUST be updated in the same PR as the behavior they describe.
- The Definition of Done includes: acceptance criteria demonstrated, docs and `sdd.yaml` aligned, templates (issue/PR) respected.
- Standards describe outcomes and principles. Tools may change; update `sdd.yaml` when they do.

## 2. Architecture

- Layers and import rules in `sdd.yaml` MUST be enforced by lint, not just convention.
- Prefer server-side rendering or static generation for public content _(web profile)_.
- Domain logic SHOULD be pure and framework-free. UI MUST NOT do I/O directly.
- Configuration and content have one source of truth each. No copies.
- Prefer composition over inheritance, small modules over large ones, and boring technology over novel.
- A new layer, framework, or cross-cutting mechanism MUST have an ADR.

## 3. Code quality

- TypeScript strict mode MUST be on. `any` and `!` need an in-line justification.
- Formatting is automated (Prettier). Lint warnings are errors in CI.
- Imports are sorted and use path aliases for core modules; no circular imports.
- No dead code, no commented-out blocks, no unused exports or dependencies.
- Functions do one thing. Names describe behavior. Comments explain why.
- Prefer `async/await`. Handle every promise.
- Errors MUST NOT be swallowed. See [Error Handling](./ERROR_HANDLING.md).

## 4. Components and UI

- Components expose small, typed prop interfaces and are stateless where possible.
- Styles use design tokens and utility classes or structured CSS; no ad-hoc inline styles.
- Every reusable component SHOULD have a doc in `docs/components/` using the template there (purpose, props, examples, accessibility, tokens, tests). Update it when the API changes.
- Use the framework primitives for navigation and images.

## 5. Accessibility

- WCAG 2.1 AA is the floor (CONSTITUTION-12). Details in [Accessibility](./ACCESSIBILITY.md).
- Automated: linting (`jsx-a11y`), axe checks in CI on key flows, Lighthouse accessibility budget.
- Manual: keyboard-only pass and a screen-reader spot check for new interaction patterns.
- A visible skip-to-content link and landmark structure on every page.

## 6. Security

- Validate all input at the boundary; sanitize before rendering; never trust the client.
- Secrets live in environment variables or a secret manager — never in the repo or the client bundle.
- Security headers and a strict CSP MUST be configured and tested; do not loosen them without an ADR.
- Public endpoints MUST have rate limiting and, where abuse is plausible, bot protection.
- Dependencies are audited in CI; high/critical findings block merge unless documented in [Security Policy](./SECURITY_POLICY.md).
- Least privilege for tokens, CI permissions (`permissions:` per workflow), and service accounts.

## 7. Testing

Strategy and templates are in [Testing](./TESTING.md). In short:

- Behavior changes ship with tests; bug fixes ship with a regression test (CONSTITUTION-13).
- Coverage thresholds in `sdd.yaml` are enforced in CI and MUST NOT be lowered to merge.
- The pyramid: many fast unit tests, fewer component tests, a small set of e2e flows, targeted visual and a11y checks.
- Tests MUST be deterministic: no fixed sleeps, no real network, frozen time, seeded randomness.

## 8. Performance and Web Vitals _(web profile)_

- Budgets are declared in `sdd.yaml` and enforced by Lighthouse CI.
- Targets: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at the 75th percentile.
- Optimize images and fonts, split bundles, avoid layout shift, defer non-critical scripts.
- Measure before optimizing; record the measurement in the PR.

## 9. SEO and discoverability _(web profile)_

- One module owns site config, per-page metadata, canonical URLs, and structured data. See [SEO Guide](./SEO_GUIDE.md).
- Every indexable page has a unique title and description, a canonical URL, and valid structured data.
- Sitemap and robots are generated, not hand-edited.

## 10. Observability

- Central error logging with structured context; no ad-hoc `console.*` in application code.
- Error tracking in client and server; release tagging so regressions map to deploys.
- Web Vitals collected from real users _(web profile)_.
- See [Observability](./OBSERVABILITY.md).

## 11. CI/CD and reliability

- Required checks are listed in `sdd.yaml` and mirrored in branch protection.
- CI is the path to production: build once in CI, deploy the prebuilt artifact, with preview environments per PR.
- Deploys are scripted and repeatable. Any manual step is documented in [Deployment](./DEPLOYMENT.md).
- Every release has a rollback path that has been tried at least once.
- GitHub Actions use least-privilege `permissions`, pinned versions, and `concurrency` to cancel superseded runs.

## 12. Dependencies and supply chain

- Add a dependency only when it removes more complexity than it adds. Justify it in the PR: need, alternatives, size, maintenance, license.
- Lockfile is committed; CI installs with `--frozen-lockfile`.
- Automated update PRs (Dependabot or equivalent) are grouped and reviewed.
- Pin third-party GitHub Actions to a full commit SHA for sensitive workflows, with a version comment.

## 13. Version control

- `main` is always deployable. Work happens on short-lived feature branches and lands via PR (CONSTITUTION-18).
- Commits are atomic and follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `perf:`, `ci:`.
- PR titles use the same `type: summary` format. The description says what **and why**, and lists skipped checklist items with reasons.
- Never commit secrets or local env files. Never force-push to protected branches.
- AI-assisted commits carry a `Co-Authored-By` trailer so provenance is visible in history.

## 14. Developer experience

- One command to set up (`pnpm install`) and one to verify (`pnpm verify`). They mirror CI.
- Pre-commit hooks run fast checks only: format/lint on staged files and the secret scan.
- A `.env.example` documents every variable; `scripts/init-template.mjs` and the README get a newcomer running in minutes.
- Keep README setup and run instructions accurate to the real tooling; stale onboarding docs are a recurring failure mode.

## 15. Privacy and compliance

- Collect the minimum personal data; document purpose and retention.
- Non-essential cookies and tracking require consent; prefer privacy-respecting analytics.
- Publish privacy and accessibility statements where they apply _(web profile)_.

## 16. Documentation set

Keep this set current; it is the project's memory.

| Document                          | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `README.md`                       | What it is, how to run it, where to read more   |
| `CONTRIBUTING.md`                 | Workflow, commands, expectations                |
| `docs/CONSTITUTION.md`, `sdd.yaml` | Invariants and the machine-readable system spec |
| `docs/ARCHITECTURE.md`            | Shape of the system and where things go         |
| `docs/adr/`, `docs/specs/`        | Decisions and feature intent                    |
| `docs/*.md` reference docs        | Testing, security, errors, config, deploy, etc. |
| `CHANGELOG.md`                    | What changed, by release                        |
