# Security Practices

Engineering-side security guidance. For reporting a vulnerability, see the root [`SECURITY.md`](../SECURITY.md).

## 1. Principles

1. Security controls are never weakened to unblock a change (CONSTITUTION-08). Fix the root cause.
2. Defense in depth: validate, authorize, rate limit, sanitize, log.
3. Least privilege everywhere: tokens, CI permissions, service accounts, database roles.
4. Secure by default: the easiest path in the codebase is the safe one.

## 2. Threat model (starting point)

Review when the architecture or data changes. Chip Ledger has no accounts, no datastore, and one optional endpoint (ADR-0004).

| Asset / surface                          | Threats                                                                   | Controls                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/photo-count` (off by default) | Cost abuse, oversized uploads, cross-site use, prompt injection via image | 404 when off; same-origin check; per-client rate limit (per instance); type and 8 MB size limits; Zod on input and on the model reply; generic errors. **Before enabling in production:** bot protection, a shared rate limiter, provider spend cap (SPEC-0001 §7) |
| Saved game in `localStorage`             | Tampered or corrupted state                                               | Zod schema on load; invalid state falls back to defaults                                                                                                                                                                                                           |
| Rendered user content                    | XSS                                                                       | Sanitization, strict CSP, controlled markdown components                                                                                                                                                                                                           |
| Secrets and tokens                       | Leak via repo, logs, client bundle                                        | Env vars, secret scanning, redacting logger, `NEXT_PUBLIC_*` discipline                                                                                                                                                                                            |
| Dependencies                             | Known CVEs, malicious packages                                            | Audit in CI, lockfile, update bot, review of new deps                                                                                                                                                                                                              |
| CI/CD                                    | Token theft, workflow injection                                           | Least-privilege `permissions`, pinned actions, no untrusted input in `run:`                                                                                                                                                                                        |
| Third-party services                     | Data over-sharing, outage                                                 | Listed in `sdd.yaml`; minimal data; timeouts                                                                                                                                                                                                                       |

## 3. Secrets

### Rules

- Never commit secrets, `.env.local`, keys, or tokens (CONSTITUTION-09).
- Read secrets from environment variables at the infra layer only.
- `NEXT_PUBLIC_*` (or equivalent) is shipped to every browser. Treat it as public.
- Document each variable in [Configuration](./CONFIGURATION.md) and mirror it in `.env.example` with an empty value.

### Detection

1. **Pre-commit:** `scripts/scan-secrets.mjs --changed` blocks obvious patterns.
2. **CI:** `audit-secrets` scans all tracked files. Enable the platform's push protection and secret scanning as well.
3. **Lint:** a rule against hard-coded credentials catches inline literals.
4. **History:** scan with a dedicated tool (for example gitleaks) when onboarding a repo and periodically.

```bash
node scripts/scan-secrets.mjs               # all tracked files
node scripts/scan-secrets.mjs --changed     # changed files only
node scripts/scan-secrets.mjs path/to/file  # specific files
```

The built-in scanner is a lightweight net, not a replacement for platform scanning.

### If a secret leaks

1. Revoke and rotate it **first**.
2. Assess exposure: what could the key do, and for how long?
3. Remove it from history (`git filter-repo`), force-push, and ask collaborators to re-clone. This does not undo exposure; rotation does.
4. Add a guard so it cannot recur (rule, test, or pattern).
5. Record the incident and the fix.

## 4. Input, output, and sessions

- Validate every external input with a schema; reject unknown fields where practical.
- Escape on output by default; sanitize rich content with an allow-list.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or stricter; short lifetimes; rotate on privilege change.
- CSRF: rely on `SameSite` plus origin checks for state-changing requests, or tokens.
- Uploads: validate type and size server-side, store outside the web root, scan if risk warrants.

### Shared games (SPEC-0003, ADR-0005)

- **Access is by possession of a key.** A watch key and one edit key per editor, each 128 random bits, carried in the URL fragment (never sent with the page request) and sent as a bearer token. The server stores only SHA-256 hashes and compares them in constant time.
- **Edit codes** are 6 characters, salted and hashed, valid for 10 minutes, and replaced by the next one. Five wrong codes lock the game's upgrades for a minute for everybody. A device that upgrades receives its own new edit key; other editors keep theirs.
- **One answer for "not found".** An unknown id, a deleted game, a malformed key, and a wrong key all return the same 404.
- **Edits are an allowlist** of the reducer's actions, applied on the server and checked with the saved-game rules. The browser's step and whole-game replacement are not accepted. Bodies are capped (8 KB for an edit, 32 KB for a game), and creation, edits, and codes are limited in the shared store so the limits hold across instances.
- **No secrets in logs or answers.** Keys, codes, and hashes are never logged or returned; store failures answer a generic 503.
- **Retention:** 24 hours after the last change or connected device the game becomes read-only; 30 days later the store deletes it. An editor can delete it earlier. Player names are the only personal data.
- **Not covered:** anyone who holds an edit link or code can edit; there is no way to remove one editor, only to delete the game (SPEC-0003 Q3).

## 5. Headers and CSP

Configured in one place: `lib/security-headers.ts` (`sdd.yaml` → `security.headers`). Static headers are applied by `next.config.ts`; the CSP is generated per request with a nonce in `proxy.ts`, which makes the page dynamically rendered. `test/e2e` asserts them. Baseline:

| Header                                | Value (starting point)                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `Content-Security-Policy`             | `default-src 'self'`, then allow-list what you need; nonces for inline scripts |
| `Strict-Transport-Security`           | `max-age=63072000; includeSubDomains; preload`                                 |
| `X-Content-Type-Options`              | `nosniff`                                                                      |
| `Referrer-Policy`                     | `strict-origin-when-cross-origin`                                              |
| `Permissions-Policy`                  | Disable unused features (camera, microphone, geolocation)                      |
| `X-Frame-Options` / `frame-ancestors` | `DENY` or an explicit allow-list                                               |

Test headers in an automated check. Loosening any of them needs an ADR.

## 6. Dependencies

- Lockfile committed; CI installs frozen.
- `audit` runs on every PR that touches manifests, on `main`, and weekly. High and critical findings block merge.
- Prefer fewer, well-maintained dependencies. Review new ones for maintainers, activity, install scripts, and license.

### Accepted dependency advisories

An advisory with no available patch may be accepted temporarily. Record every acceptance here; undocumented ignores are not allowed.

| Advisory | Package / path | Why accepted | Mitigation | Review by |
| -------- | -------------- | ------------ | ---------- | --------- |
| _none_   |                |              |            |           |

## 7. CI/CD hardening

- Set top-level `permissions: contents: read` in every workflow and elevate per job.
- Never interpolate untrusted values (`github.event.pull_request.title`, branch names) into `run:` scripts; pass them through `env:`.
- Pin third-party actions to a commit SHA for workflows with write access or secrets.
- Do not run untrusted fork code with secrets (`pull_request_target` needs extreme care).
- Require status checks and reviews via branch protection; restrict who can push to `main`.

## 8. For AI contributors

AI agents follow the same rules plus: never bypass a control to make a test pass, never paste secrets into prompts or commits, never invent security-sensitive code (crypto, auth) when a vetted library exists, and flag any change touching auth, payments, or data integrity for human review.

## 9. Supported versions

| Version                 | Supported    |
| ----------------------- | ------------ |
| `main` / latest release | Yes          |
| Older releases          | No — upgrade |

## Related

[`SECURITY.md`](../SECURITY.md) · [Forbidden Patterns](./FORBIDDEN_PATTERNS.md) · [Configuration](./CONFIGURATION.md) · [Deployment](./DEPLOYMENT.md)
