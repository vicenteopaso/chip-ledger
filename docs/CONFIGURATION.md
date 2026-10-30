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

| Variable               | Scope  | Required | Secret | Description                                                              |
| ---------------------- | ------ | -------- | ------ | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL` | Client | Prod     | No     | Canonical origin, no trailing slash. Defaults to `http://localhost:3000` |
| `NODE_ENV`             | Both   | Auto     | No     | Set by the framework/runtime                                             |

### Photo counting

Off unless `PHOTO_COUNT_ENABLED=true` ([SPEC-0001](./specs/0001-chip-ledger/spec.md) REQ-0001-13). With it on and a key or model missing, the server fails fast naming the variable. Read SPEC-0001 §7 before enabling in production.

| Variable                   | Scope  | Required     | Secret | Description                                                            |
| -------------------------- | ------ | ------------ | ------ | ---------------------------------------------------------------------- |
| `PHOTO_COUNT_ENABLED`      | Server | No           | No     | `true` turns photo counting on; anything else keeps it off             |
| `PHOTO_COUNT_API_BASE_URL` | Server | No           | No     | OpenAI-compatible base URL. Defaults to `https://openrouter.ai/api/v1` |
| `PHOTO_COUNT_API_KEY`      | Server | When enabled | Yes    | Provider API key                                                       |
| `PHOTO_COUNT_MODEL`        | Server | When enabled | No     | Vision-capable model id at that provider                               |

All of them are read only in `lib/infra/env.ts`.

### Shared games

Off unless the store is configured ([SPEC-0003](./specs/0003-shared-live-games/spec.md), [ADR-0005](./adr/0005-shared-live-games-architecture.md)). Set both Redis variables or neither: with only one, the server fails fast naming the missing variable. Every key the app writes starts with the deployment environment (`VERCEL_ENV`, or `local` outside Vercel), so Preview and Production can share one database without sharing games.

| Variable            | Scope  | Required | Secret | Description                                                                                                              |
| ------------------- | ------ | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| `KV_REST_API_URL`   | Server | No       | No     | Upstash Redis REST endpoint, from the Vercel Marketplace integration. `http(s)` URL                                      |
| `KV_REST_API_TOKEN` | Server | No       | Yes    | Upstash Redis REST token. Read and write; never the read-only token                                                      |
| `GAME_STORE_MEMORY` | Server | No       | No     | `true` keeps shared games in process memory for local development and end-to-end tests. Refused when `VERCEL_ENV` is set |
| `VERCEL_ENV`        | Server | Auto     | No     | Set by Vercel (`production`, `preview`, or a custom slug). Used as the key prefix; not set by hand                       |

The integration also adds `KV_REST_API_READ_ONLY_TOKEN`, `KV_URL` and `REDIS_URL`; the app does not read them. All of the variables above are read only in `lib/infra/env.ts`. The Preview variables are scoped to the feature branches that need them (ADR-0005).

No error tracker is configured yet; errors go to platform logs through `lib/error-logging.ts`.

## 3. Configuration files

| File                      | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `.nvmrc`                  | Node.js version (single source for local + CI)                  |
| `package.json`            | Dependencies, scripts, `packageManager`, `engines`, lint-staged |
| `pnpm-workspace.yaml`     | pnpm settings: which dependency build scripts may run           |
| `tsconfig.json`           | TypeScript (strict)                                             |
| `eslint.config.mjs`       | Lint rules, including layer boundaries                          |
| `prettier.config.mjs`     | Formatting                                                      |
| `postcss.config.mjs`      | Tailwind CSS                                                    |
| `vitest.config.ts`        | Unit tests and coverage thresholds                              |
| `playwright.config.ts`    | E2E, visual, and a11y projects                                  |
| `lighthouserc.json`       | Lighthouse CI budgets                                           |
| `next.config.ts`          | Framework config; applies static security headers               |
| `lib/security-headers.ts` | Security header values and the CSP                              |
| `proxy.ts`                | Per-request CSP nonce                                           |
| `.github/workflows/*`     | CI/CD                                                           |

## 4. Governance files

| File                      | Purpose                                               |
| ------------------------- | ----------------------------------------------------- |
| `docs/CONSTITUTION.md`    | Immutable invariants                                  |
| `sdd.yaml`                | Machine-readable system spec                          |
| `sdd.schema.json`         | Schema validating `sdd.yaml`                          |
| `.github/CODEOWNERS`      | Required reviewers for governance and sensitive paths |
| `AGENTS.md` / `CLAUDE.md` | Entry point for AI agents                             |

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
