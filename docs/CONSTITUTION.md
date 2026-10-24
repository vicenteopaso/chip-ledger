# Engineering Constitution

The Constitution is the highest-precedence document in this repository. It holds only stable invariants. Everything else — standards, patterns, tooling — can change; these cannot change without the amendment process below.

> **Template note:** the invariants below are a vetted baseline for web applications. Keep them, tighten them, or add project-specific ones. Do not leave placeholders in a live project.

## Supremacy

When two artifacts conflict, the one higher in this list wins:

1. `docs/CONSTITUTION.md`
2. `sdd.yaml`
3. ADRs (`docs/adr/`)
4. Feature specs (`docs/specs/`)
5. Other documentation (`docs/`, `README.md`)
6. Code and tests

A lower artifact that contradicts a higher one is a defect in the lower artifact. If the higher artifact is the one that is wrong, fix it through its own change process (an amendment for the Constitution, an ADR for `sdd.yaml`) — never by quietly diverging.

Any change that violates this Constitution is invalid by definition, whether or not CI passes.

## Reading the invariants

- **MUST / MUST NOT / NEVER** are requirements in the RFC 2119 sense.
- Every invariant has a stable ID of the form `CONSTITUTION-NN`. IDs are never reused or renumbered. Retired invariants stay in the list marked `[RETIRED]`.
- Each invariant is mapped to its enforcement mechanism in `sdd.yaml` under `constitution.enforcement`. `scripts/check-sdd-refs.mjs` fails CI if an invariant has no declared enforcement.
- Invariant lines start at column 0 as `CONSTITUTION-NN: …` so scripts can parse them. Keep that format.

## Invariants

### Governance

CONSTITUTION-01: All changes, human or AI-authored, MUST comply with this Constitution.
CONSTITUTION-02: Any change to externally observable behavior, architecture, or a cross-cutting concern MUST be described in a feature spec, ADR, or SDD update before the code lands, or in the same PR.
CONSTITUTION-03: The System Design & Development Spec (`sdd.yaml`) MUST remain machine-readable, schema-valid, and consistent with the implementation. Drift MUST be fixed in the PR that introduces it.
CONSTITUTION-16: Documentation MUST be updated in the same PR as the behavior it describes. Documentation that contradicts the code is a defect.
CONSTITUTION-17: AI-generated changes MUST be reviewed by a human. Changes to architecture, security, authentication/authorization, payments, or data integrity MUST have explicit human approval before merge.
CONSTITUTION-18: `main` MUST always be deployable. Changes land through reviewed pull requests from short-lived branches.

### Architecture

CONSTITUTION-04: Architectural layer boundaries declared in `sdd.yaml` MUST be enforced. Cross-layer imports MUST NOT be introduced.
CONSTITUTION-05: UI code MUST NOT perform infrastructure concerns (filesystem access, direct secret/environment access, direct datastore access).
CONSTITUTION-06: Domain and business logic MUST be framework-agnostic where practical, isolated from UI and transport code, and unit-tested.
CONSTITUTION-07: New architectural layers or cross-cutting mechanisms MUST NOT be introduced without an ADR and a corresponding `sdd.yaml` update.

### Security

CONSTITUTION-08: Security controls (authentication, authorization, rate limiting, bot protection, origin checks, security headers, sanitization) MUST NOT be weakened, bypassed, or removed to unblock a change. Fix the root cause instead.
CONSTITUTION-09: Secrets and credentials MUST NEVER be committed to the repository. An exposed secret MUST be rotated immediately; removing it in a later commit or force-pushing is not sufficient.
CONSTITUTION-10: All external input MUST be validated against an explicit schema at the system boundary before it is used.
CONSTITUTION-11: Errors MUST NOT fail silently. User-facing error messages MUST be generic; diagnostic detail (stack traces, internal paths, environment values) MUST go only to server-side logs and observability tooling.

### Quality

CONSTITUTION-12: Accessibility MUST NOT regress. WCAG 2.1 AA is the minimum conformance level.
CONSTITUTION-13: Behavior changes MUST ship with tests, and bug fixes MUST ship with a regression test. Failing tests MUST NOT be skipped, deleted, or weakened to make a change pass.
CONSTITUTION-14: Required CI checks and local hooks MUST NOT be bypassed or disabled (for example `--no-verify`, blanket lint-rule disables, lowered thresholds) except through an approved amendment or ADR.
CONSTITUTION-15: SEO-critical behavior (metadata, canonical URLs, structured data, indexability) and performance budgets MUST NOT regress. _(Web profile — retire if the project is not a public website.)_

## Optional invariants

Adopt an invariant by moving it into the numbered list above with the next free ID, mapping it in `sdd.yaml`, and adding enforcement. Delete the ones you do not need.

- **OPT-I18N** — All user-facing routes and user-visible text MUST be locale-aware; no hard-coded locale prefixes or English-only strings.
- **OPT-PRIVACY** — Personal data MUST be collected only with a documented purpose and retention period; non-essential tracking MUST be consent-gated.
- **OPT-OFFLINE** — Core user flows MUST degrade gracefully without a network connection.

## Amendment process

The Constitution changes rarely and deliberately.

1. Open a PR labeled `constitution-amendment` that changes only this file plus the matching `sdd.yaml` enforcement entries.
2. Include an ADR explaining the problem, alternatives, and consequences.
3. Obtain explicit approval from every code owner of this file (see `.github/CODEOWNERS`).
4. Never edit an invariant's meaning in place without an ADR. Prefer adding a new invariant and retiring the old one.

## Traceability

| Invariant group | Primary enforcement                                              |
| --------------- | ---------------------------------------------------------------- |
| Governance      | PR template, CODEOWNERS, `sdd-check` workflow, review checklist  |
| Architecture    | Lint import rules, `sdd.yaml` layers, code review                |
| Security        | Secret scanning, dependency audit, CodeQL, lint security rules   |
| Quality         | CI test/coverage/a11y gates, `check-pr-tests`, review checklist  |

The authoritative per-invariant mapping lives in `sdd.yaml` (`constitution.enforcement`).
