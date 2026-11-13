# Tasks: SPEC-0008 Tell people when a new version is out

Ordered, small, independently verifiable. Each task names the requirement it serves, the tests that prove it, and a done-condition. Check a box only when the done-condition holds.

Legend: `[P]` can run in parallel with its neighbours.

## Setup

- [ ] T-01 Build-time `NEXT_PUBLIC_APP_VERSION` and `lib/app-version.ts` _(REQ-0008-03)_
  - Tests: unit for `isDifferentVersion`, including `"dev"`
  - Done when: a preview deployment serves the expected commit id (checked once, recorded in the PR)

## Core

- [ ] T-02 `GET /api/version` route _(REQ-0008-01, -05)_
  - Tests: route test for shape, `no-store`, limiter 429 with `Retry-After`, generic 500
  - Done when: route tests pass and the route reads no store
- [ ] T-03 `fetchVersion` client and `useNewVersion` hook _(REQ-0008-01, -02, -04)_
  - Tests: client parse failures; hook timing with fake timers (open, visible, 10 minutes, none while hidden)
  - Done when: AC-0008-03 passes and unit coverage meets the threshold
- [ ] T-04 [P] `VersionNotice` and the `ActionBar` slot _(REQ-0008-06, -07, -08)_
  - Tests: component test (button, no dismiss, live region text); visual baselines in both themes; axe
  - Done when: AC-0008-10 and AC-0008-12 pass
- [ ] T-05 Mount on the solo app, the shared game app and the "not available" page; Refresh blurs then reloads _(REQ-0008-06, -09, -11, -12)_
  - Tests: component tests per page
  - Done when: AC-0008-01, -02, -06 and -09 pass in e2e
- [ ] T-06 Shared refresh waits for pending edits _(REQ-0008-10)_
  - Tests: editor hook waits for `pending = 0`; "Saving your changes…" announced
  - Done when: AC-0008-07 passes; the offline branch waits for the owner's decision on the proposed amendment (plan §5)

## Version compatibility

- [ ] T-07 `EDIT_PROTOCOL`, optional envelope `protocol`, `outdated_client` refusal _(REQ-0008-13)_
  - Tests: schema accepts missing and current protocol; route refuses below the minimum with the new type
  - Done when: route tests pass with `MIN_EDIT_PROTOCOL` stubbed to 2
- [ ] T-08 Editor pauses on `outdated`, mirrors the queue to `sessionStorage`, re-validates after reload _(REQ-0008-13)_
  - Tests: pending-edits storage unit; editor hook pause; drop-with-reason for invalid kept actions
  - Done when: AC-0008-11 passes in e2e

## Verification and close

- [ ] T-09 AC-0008-04, -05 and -08 in e2e (rollback value, offline solo, offline shared per the approved wording)
- [ ] T-10 Real-phone check: installed app and Safari tab both show the notice after a preview redeploy (screenshots in the PR)
- [ ] T-11 Update the docs listed in the plan §7
- [ ] T-12 `pnpm verify` passes; Lighthouse performance ≥ 90
- [ ] T-13 Set spec status to `implemented` and update `docs/specs/README.md`
