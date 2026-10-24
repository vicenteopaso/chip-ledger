# Plan: SPEC-NNNN Short Title

| Field  | Value                         |
| ------ | ----------------------------- |
| Spec   | [spec.md](./spec.md)          |
| ADR    | ADR-NNNN, or `none (Tier 1)`  |
| Status | draft                         |

## 1. Approach

The chosen design in a few paragraphs. Link the ADR for any decision with real alternatives.

## 2. Constitution check

Confirm the design against `docs/CONSTITUTION.md`. A "No" needs a justification or a redesign.

| Invariant group | Complies? | Notes |
| --------------- | --------- | ----- |
| Governance (01–03, 16–18) |    |       |
| Architecture (04–07)      |    |       |
| Security (08–11)          |    |       |
| Quality (12–15)           |    |       |

## 3. Design

- **Layers touched** (per `sdd.yaml` `standards.architecture.layers`): …
- **Files and modules:** new / changed / removed.
- **Data model and contracts:** schemas (Zod), API request/response shapes, events.
- **Control flow:** a short sequence or a Mermaid diagram.

## 4. Testing strategy

| Requirement | Unit | Component | E2E | Visual | A11y |
| ----------- | ---- | --------- | --- | ------ | ---- |
| REQ-NNNN-01 |      |           |     |        |      |

## 5. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
|      |            |        |            |

## 6. Rollout and rollback

Feature flag or direct release, migration steps, how to detect trouble, and how to revert.

## 7. Documentation to update

- [ ] Reference docs: …
- [ ] `sdd.yaml` (if structure, gates, or services changed)
- [ ] `.env.example` and `docs/CONFIGURATION.md` (if new variables)
- [ ] Component docs in `docs/components/`
