# Tasks: SPEC-NNNN Short Title

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds.

Legend: `[P]` can run in parallel with its neighbours.

## Setup

- [ ] T-01 Add schema and types for … _(REQ-NNNN-01)_
  - Tests: unit for schema accept/reject cases
  - Done when: `pnpm test` passes for the new schema and `pnpm typecheck` is clean

## Core

- [ ] T-02 Implement … in the domain layer _(REQ-NNNN-01)_
  - Tests: unit, including boundary and invalid inputs
  - Done when: coverage for the new module meets the threshold
- [ ] T-03 [P] Build the UI … _(REQ-NNNN-02)_
  - Tests: component test (role/label queries), a11y assertion
  - Done when: keyboard-only walkthrough works and axe reports no violations

## Integration

- [ ] T-04 Wire the API route … _(REQ-NNNN-03)_
  - Tests: route handler tests for success, validation failure, rate limit
  - Done when: error responses are generic and the failure is logged server-side

## Verification and close

- [ ] T-05 E2E happy path and primary failure path _(AC-NNNN-01…)_
- [ ] T-06 Update docs, `sdd.yaml`, `.env.example` as listed in the plan
- [ ] T-07 Set spec status to `implemented` and update `docs/specs/README.md`
- [ ] T-08 File follow-up issues for anything deferred
