# Changelog

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Chip Ledger app ([SPEC-0001](./docs/specs/0001-chip-ledger/spec.md), [ADR-0004](./docs/adr/0004-chip-ledger-client-architecture.md)): setup, table, cash out, and settle steps ported from the single-file prototype, with validated browser storage, layered code, unit/component/e2e/visual/axe tests, security headers with a nonce CSP, and photo counting through an OpenAI-compatible provider (disabled by default).
- Initial governance baseline: Constitution, `sdd.yaml` and schema, ADRs 0001–0003, spec templates, AI guardrails, engineering and operations docs, CI workflows, PR and issue templates, and dependency-free governance scripts.

## [0.1.0] - 2026-01-01

### Added

- First release of the template.

[Unreleased]: https://github.com/vicenteopaso/chip-ledger/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vicenteopaso/chip-ledger/releases/tag/v0.1.0
