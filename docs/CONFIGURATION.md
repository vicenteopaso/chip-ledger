# Configuration

The inventory of every environment variable and configuration file. **This file is the source of truth for `.env.example`** — a new variable is not done until it appears in both, with the same name.

## 1. Rules

1. Copy `.env.example` to `.env.local` for local development. Never commit `.env.local` or real values.
2. Read configuration through one validated module (a Zod schema over `process.env`) that fails fast at startup and names the missing variable without printing its value.
3. `NEXT_PUBLIC_*` (or your framework's equivalent) is shipped to the browser. Never put a secret there.
4. Secrets are read only in the infra layer, never in UI code (CONSTITUTION-05).
5. Production values live in the hosting platform or a secret manager, not in the repo.
6. Rotate any secret that may have been exposed (see [Security Practices](./SECURITY_POLICY.md)).

## 2. Variable inventory

Replace the example rows. Keep one table per concern.

Columns: **Scope** is where the value is available (`Server`, `Client`, `Build`, `Both`); **Secret** means it must never reach the client or logs.

### Application

| Variable               | Scope  | Required | Secret | Description                                      |
| ---------------------- | ------ | -------- | ------ | ------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL` | Client | Yes      | No     | Canonical origin, no trailing slash              |
| `NODE_ENV`             | Both   | Auto     | No     | Set by the framework/runtime                     |

### Error tracking

| Variable                    | Scope  | Required | Secret | Description                                   |
| --------------------------- | ------ | -------- | ------ | --------------------------------------------- |
| `SENTRY_DSN`                | Server | Prod     | No\*   | DSN for the server SDK                        |
| `NEXT_PUBLIC_SENTRY_DSN`    | Client | Prod     | No     | DSN for the browser SDK                       |
| `SENTRY_ENVIRONMENT`        | Both   | No       | No     | `development` / `preview` / `production`      |
| `SENTRY_AUTH_TOKEN`         | Build  | Prod     | Yes    | Source map upload token                       |
| `SENTRY_TRACES_SAMPLE_RATE` | Both   | No       | No     | 0.0–1.0, default 0.1                          |

\* Treat DSNs as low-sensitivity but do not publish server DSNs unnecessarily.

### Example: third-party integration

| Variable          | Scope  | Required | Secret | Description                       |
| ----------------- | ------ | -------- | ------ | --------------------------------- |
| `EXAMPLE_API_KEY` | Server | Yes      | Yes    | Key for the example service       |

## 3. Configuration files

| File                      | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `.nvmrc`                  | Node.js version (single source for local + CI) |
| `package.json`            | Dependencies, scripts, `packageManager`, `engines` |
| `tsconfig.json`           | TypeScript (strict)                          |
| `eslint.config.mjs`       | Lint rules, including layer boundaries       |
| `vitest.config.ts`        | Unit tests and coverage thresholds           |
| `playwright.config.ts`    | E2E, visual, and a11y projects               |
| `lighthouserc.json`       | Lighthouse CI budgets                        |
| `next.config.mjs`         | Framework config and security headers        |
| `.github/workflows/*`     | CI/CD                                        |

## 4. Governance files

| File                   | Purpose                                              |
| ---------------------- | ---------------------------------------------------- |
| `docs/CONSTITUTION.md` | Immutable invariants                                 |
| `sdd.yaml`             | Machine-readable system spec                         |
| `sdd.schema.json`      | Schema validating `sdd.yaml`                         |
| `.github/CODEOWNERS`   | Required reviewers for governance and sensitive paths |
| `AGENTS.md` / `CLAUDE.md` | Entry point for AI agents                         |

## 5. Adding a variable (checklist)

- [ ] Add to the validated config module
- [ ] Add to `.env.example` (empty value, short comment on where to obtain it)
- [ ] Add a row above
- [ ] Set in each hosting environment (preview and production)
- [ ] Add to CI secrets if build or tests need it
- [ ] Confirm it is not `NEXT_PUBLIC_*` if it is secret
- [ ] Mention it in the PR description

## 6. Hosting configuration

Production variables are set in the hosting platform's environment settings, scoped per environment (preview vs production). Document required GitHub Actions secrets in [Deployment](./DEPLOYMENT.md). When a fix touches env or config validation, verify the full runtime environment, including variables the platform does not expose to local pulls.
