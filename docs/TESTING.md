# Testing Guide

How we prove behavior. Tests are the executable half of the spec: every requirement in `docs/specs/` should be verified by at least one test that cites its ID.

> **Template note:** commands and file paths assume Vitest + Testing Library + Playwright + axe. Swap tools freely; keep the principles and the CI gates.

## 1. Principles

1. **Test behavior, not implementation.** Assert what a user or caller observes.
2. **Fast feedback first.** Most tests are unit tests that run in milliseconds.
3. **Deterministic.** No fixed sleeps, real network calls, wall-clock time, or unseeded randomness.
4. **Tests are code.** Review them, keep them readable, refactor them.
5. **Never skip or weaken a test to merge** (CONSTITUTION-13). Fix the code or the test, or defer with a tracking issue.

## 2. The pyramid

| Level          | Tool (default)                | Scope                                       | Volume  | Speed     |
| -------------- | ----------------------------- | ------------------------------------------- | ------- | --------- |
| Unit           | Vitest                        | Pure functions, schemas, domain logic       | Many    | ms        |
| Component      | Vitest + Testing Library      | One component, props and events, a11y roles | Many    | 10s of ms |
| Route/contract | Vitest                        | API handlers with mocked infra              | Several | 10s of ms |
| E2E            | Playwright                    | Critical user flows in a real browser       | Few     | seconds   |
| Visual         | Playwright screenshots        | Layout and theme regressions                | Targeted | seconds  |
| Accessibility  | axe via Playwright            | Violations per page/state/theme             | Targeted | seconds  |

## 3. What to test

| Change                | Required tests                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| New pure logic        | Unit: valid, invalid, boundary, and error cases                                 |
| New component         | Component: renders from props, events, keyboard, accessible roles/names         |
| New route / action    | Route tests: success, validation failure, unauthorized, rate-limited, upstream failure |
| New user flow         | E2E: happy path plus the primary failure path                                   |
| UI change             | Visual (light/dark, mobile/desktop) and an axe check                            |
| Bug fix               | A regression test that fails before the fix and passes after                    |
| Refactor              | Existing tests pass unmodified (that is the point)                              |

## 4. Coverage

Thresholds are declared in `sdd.yaml` (`devex.ci.coverage-thresholds`) and enforced in the test runner config, so CI fails on violation. Defaults: lines 90, statements 90, functions 90, branches 85.

- Coverage measures what ran, not what was verified. Reviewers judge assertion quality.
- Do not add assertion-free tests to move the number ([FP-21](./FORBIDDEN_PATTERNS.md)).
- Exclusions (generated code, type-only files, config) are listed with a reason in the runner config.
- `scripts/check-pr-tests.mjs` additionally requires that PRs changing code paths also change tests.

## 5. Conventions

- Unit/component tests live in `test/unit/` mirroring `app/` and `lib/` (or colocated `*.test.ts`; pick one per repo and say so in `sdd.yaml`).
- E2E in `test/e2e/`, visual in `test/visual/`, accessibility in `test/a11y/`.
- Name tests by behavior and cite requirements: `it("REQ-0007-01: rejects a malformed email")`.
- Arrange–Act–Assert. One reason to fail per test.
- Query by role and accessible name first (`getByRole`), then label/text; use test IDs only as a last resort.
- Mock at the boundary (HTTP, clock, randomness), not inside the unit under test.

### Unit test template

```typescript
import { describe, expect, it } from "vitest";
import { parseSlug } from "@/lib/slug";

describe("parseSlug", () => {
  it("REQ-0003-01: lowercases and hyphenates words", () => {
    expect(parseSlug("Hello World")).toBe("hello-world");
  });

  it("REQ-0003-02: rejects empty input", () => {
    expect(() => parseSlug("")).toThrow(/empty/i);
  });
});
```

### Component test template

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "@/app/components/SignupForm";

it("REQ-0007-01: shows an announced error for a malformed email", async () => {
  render(<SignupForm onSubmit={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(/email/i), "nope");
  await userEvent.click(screen.getByRole("button", { name: /sign up/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
});
```

### E2E template

```typescript
import { expect, test } from "@playwright/test";

test("REQ-0007: visitor can sign up", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByRole("status")).toHaveText(/thanks/i);
});
```

## 6. Visual regression

Use visual tests to catch layout and theme regressions, not to assert behavior.

- Cover critical pages and key components in light and dark themes, at mobile and desktop widths.
- Wait for stable state with shared helpers (fonts loaded, images decoded, network idle, animation off) — never `waitForTimeout`.
- Mask or freeze dynamic regions (dates, ads, charts with live data) and disable animations globally.
- Keep a small tolerance (`maxDiffPixelRatio`) to absorb anti-aliasing noise; never raise it to hide a real diff.
- Baselines are committed. Update them only for intentional changes, in the same PR, and review the image diff. Generate baselines in the same environment as CI (container or the CI workflow) to avoid OS rendering drift.
- Suppress third-party widgets (analytics toolbars, consent banners) in test mode.

## 7. Accessibility tests

- Run axe on each key page and on interactive states (dialog open, menu expanded, error shown), in every theme.
- Automated checks catch roughly a third of issues; pair them with a keyboard-only walkthrough in review.
- Assert focus order and focus return for dialogs and menus in component or e2e tests.

## 8. Running tests

```bash
pnpm test              # unit + component
pnpm test --watch      # watch mode
pnpm coverage          # with thresholds
pnpm test:e2e          # Playwright e2e (starts the app)
pnpm test:visual       # visual regression
pnpm test:visual:update # refresh baselines after an intentional change
pnpm test:a11y         # axe audits
pnpm verify            # lint + typecheck + coverage + build + e2e
```

## 9. Flaky tests

A flaky test is a bug. Quarantining is a last resort and needs an issue.

1. Reproduce with repetition (`--repeat-each=20`).
2. Find the race: unawaited promise, animation, real time, shared state, network.
3. Replace sleeps with condition-based waits; isolate state per test.
4. Only then, if the cause is external, mark it with a linked issue and a deadline.

## 10. CI integration

| Job                   | Runs                                              |
| --------------------- | ------------------------------------------------- |
| `verify`              | lint, typecheck, unit tests with coverage, build  |
| `test-e2e`            | Playwright e2e against a production build         |
| `test-a11y`           | axe audits                                        |
| `test-coverage-check` | PR must change tests when it changes code paths   |
| `lighthouse`          | Performance/a11y/SEO budgets                      |

Failed e2e/visual runs upload the report and traces as artifacts.

## 11. Troubleshooting

| Symptom                           | Likely cause and fix                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| Passes locally, fails in CI       | Node/browser version drift, timing, OS rendering. Match `.nvmrc`; use the CI container for visual baselines |
| E2E timeouts                      | App not built or port busy. Build first; use the config's `webServer`    |
| Visual diffs of a few pixels      | Unmasked dynamic content or font loading. Mask/wait; do not raise tolerance blindly |
| Coverage drops unexpectedly       | New file with no tests, or excluded path changed. Check the report       |
| "Cannot find module" in tests     | Path alias missing in the runner config                                  |

## Related

[Constitution](./CONSTITUTION.md) · [Forbidden Patterns](./FORBIDDEN_PATTERNS.md) · [Review Checklist](./REVIEW_CHECKLIST.md) · [Accessibility](./ACCESSIBILITY.md)
