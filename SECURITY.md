# Security Policy

## Reporting a vulnerability

Please report security issues **privately**:

- Use [GitHub private vulnerability reporting](https://github.com/vicenteopaso/chip-ledger/security/advisories/new), or
- Email **{{SECURITY_CONTACT}}**.

Do not open public issues or pull requests for new, undisclosed vulnerabilities.

Include, if you can:

- A clear description and the potential impact
- Reproduction steps, affected URL(s) or component, environment, and commit SHA
- Logs, screenshots, or a proof of concept
- Do **not** include real secrets or personal data in the report

## What to expect

- Acknowledgement within a few business days (best effort; adjust this to your capacity).
- A fix or mitigation plan once the report is triaged, with updates as work progresses.
- Coordinated disclosure: please give us reasonable time to fix before publishing. We are glad to credit reporters on request after a fix ships.

## Scope

In scope: this repository's code, configuration, and deployed environments.
Out of scope: vulnerabilities in third-party platforms or services we use, social engineering, and denial-of-service via volumetric traffic.

## Automated protections

- Dependency audit on every manifest change and weekly (`security-audit` workflow); high and critical findings block merge.
- Static analysis with CodeQL on PRs and weekly.
- Secret scanning in CI and in the pre-commit hook (`scripts/scan-secrets.mjs`), plus platform push protection.
- Accepted advisories and their mitigations are recorded in [`docs/SECURITY_POLICY.md`](./docs/SECURITY_POLICY.md).

Engineering guidance for contributors is in [`docs/SECURITY_POLICY.md`](./docs/SECURITY_POLICY.md).
