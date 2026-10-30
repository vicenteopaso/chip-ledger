# Review Checklist

One checklist for every change, human or AI-authored. Automated checks cover a lot; this list is for the judgment CI cannot make.

## How to use

| Change type                                | Do                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Docs, formatting, minor fix                | Section 1 (spirit), 9, and anything the diff touches                    |
| Feature, refactor, fix                     | Sections 1–10 as applicable                                             |
| Security-sensitive (auth, API, validation) | Section 2 twice, plus a second reviewer; exercise the controls manually |
| AI-generated                               | Everything above, plus section 11                                       |

**Authors:** self-review against this list before requesting review and tick the matching items in the PR template.
**Reviewers:** leave comments that cite the item or a `FP-NN` ID from [Forbidden Patterns](./FORBIDDEN_PATTERNS.md). Blockers are items in sections 2 (security), 3 (accessibility), and 4 (tests); the rest are judgment calls.

---

## 0. Spec and scope

- [ ] The PR links its spec (Tier 1–2) or states why none is needed (Tier 0)
- [ ] The diff matches the spec; extra behavior was added to the spec first
- [ ] An ADR is linked for architecture changes (label `architecture-change`)
- [ ] No unrelated refactors, reformatting, or drive-by changes

## 1. Code quality

- [ ] Lint, format, and typecheck pass with no new warnings
- [ ] No `any`, non-null assertions, or lint disables without an in-line justification
- [ ] `import type` for type-only imports; imports sorted
- [ ] Functions have one responsibility; names say what they do
- [ ] No duplicated logic; no dead code or commented-out blocks
- [ ] Follows [Engineering Standards](./ENGINEERING_STANDARDS.md) and the layer contract in `sdd.yaml`

## 2. Security

- [ ] All external input is validated with a schema at the boundary, with length limits
- [ ] AuthN/AuthZ derived server-side; no client-trusted identity or roles
- [ ] Rate limiting, bot protection, and origin checks intact on public endpoints
- [ ] No unsanitized HTML; no raw `innerHTML` / `dangerouslySetInnerHTML` without sanitizing
- [ ] No secrets in code, logs, URLs, or git history; `NEXT_PUBLIC_*`-style variables are truly public
- [ ] `.env.example` and [`CONFIGURATION.md`](./CONFIGURATION.md) updated for new variables
- [ ] Errors are logged with context via the central helper; users see generic messages
- [ ] New dependencies are justified, maintained, license-compatible, and pass the audit
- [ ] CSP and security headers unchanged, or changed with an ADR

## 3. Accessibility

- [ ] Semantic elements and landmarks; heading levels do not skip
- [ ] Every interactive element is reachable and operable by keyboard; focus is visible; no traps
- [ ] Forms: labels bound to inputs; errors announced and associated (`aria-describedby`)
- [ ] ARIA is used only where native HTML cannot do the job, and correctly
- [ ] Contrast of at least 4.5:1 for text (3:1 for large text and UI components) in every theme
- [ ] Images have meaningful `alt` or `alt=""`; media has captions or transcripts
- [ ] Respects `prefers-reduced-motion`; nothing relies on color alone
- [ ] Verified with axe and a manual keyboard pass (and a screen reader for new patterns)

## 4. Testing

- [ ] New behavior has unit tests; user flows have e2e tests; UI changes have visual/a11y checks
- [ ] Bug fixes include a regression test that fails without the fix
- [ ] Tests cite spec requirement IDs where applicable
- [ ] Tests assert behavior, not implementation; no fixed sleeps; dynamic content is masked or frozen
- [ ] No skipped, deleted, or weakened tests; coverage thresholds not lowered
- [ ] Edge cases covered: empty, max length, malformed, unauthorized, network failure

## 5. Performance

- [ ] No heavy synchronous work on the main thread or in render
- [ ] Images sized and optimized; fonts loaded without layout shift
- [ ] No large new dependency without a bundle-size check; granular imports
- [ ] Data fetching avoids waterfalls and N+1 patterns; caching is keyed and bounded
- [ ] Lighthouse/Core Web Vitals budgets still met

## 6. SEO (public pages)

- [ ] Unique `<title>` and meta description; canonical URL set
- [ ] Open Graph and social metadata present; structured data valid
- [ ] Indexability as intended (robots, sitemap, status codes); 404s are real 404s
- [ ] Heading structure and internal links make sense without styling

## 7. Architecture and maintainability

- [ ] Layer boundaries respected; no cross-layer imports
- [ ] No shared mutable state; side effects isolated in the right layer
- [ ] Centralized utilities used (logging, sanitization, validation, metadata)
- [ ] The simplest design that meets the spec; no speculative abstractions
- [ ] Failure modes handled: timeouts, retries with limits, partial failure, idempotency

## 8. Content, copy, and i18n (if adopted)

- [ ] User-visible strings come from the translation/content layer
- [ ] No hard-coded locale prefixes; dates, numbers, and plurals formatted by locale
- [ ] Content changes validated by their schema

## 9. CI, build, and delivery

- [ ] All required checks are green (see `sdd.yaml` → `devex.ci.required-checks`)
- [ ] Production build succeeds without new warnings
- [ ] Migrations and config changes are backward compatible and documented
- [ ] Rollout and rollback are described for anything risky
- [ ] CHANGELOG / release label is correct (`feat`, `fix`, `docs`, …)

## 10. Documentation

- [ ] README, reference docs, component docs, and `sdd.yaml` reflect the change
- [ ] Comments explain why, not what; no stale comments
- [ ] Spec status updated; follow-ups filed as issues

## 11. AI-specific checks

- [ ] The author understands every line; nothing is accepted on trust
- [ ] No hallucinated APIs, packages, or options (verify they exist in the installed version)
- [ ] No invented tests that assert nothing; no fabricated results in the PR description
- [ ] The agent stayed in scope and did not touch CI config, permissions, or model settings unprompted
- [ ] Claims in the PR are backed by evidence (commands run, screenshots)
- [ ] Security, architecture, auth, payments, and data-integrity changes have explicit human approval

## 12. Merge readiness

- [ ] PR title follows `type: summary`; description explains what **and why**
- [ ] Skipped checklist items are listed in the PR with the reason
- [ ] Required approvals obtained, including code owners for governance files
- [ ] Branch is up to date with `main`; history is clean
- [ ] After merge: confirm the deploy, watch error rates, and close the spec

## Quick reference: frequent catches

1. New env var missing from `.env.example` and `CONFIGURATION.md`
2. Error path returns `error.message` to the client
3. Missing validation on a new route or server action
4. Contrast failure in dark theme or high-contrast mode
5. Focus lost after closing a dialog
6. Test passes only because it asserts nothing
7. Spec or `sdd.yaml` not updated after a design change
