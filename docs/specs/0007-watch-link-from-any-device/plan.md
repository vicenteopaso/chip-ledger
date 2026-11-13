# Plan: SPEC-0007 Watch link from any device in the game

| Field  | Value                                        |
| ------ | -------------------------------------------- |
| Spec   | [spec.md](./spec.md)                         |
| ADR    | none (Tier 1, reasoning in spec §6 Security) |
| Status | draft                                        |

## 1. Approach

A **Can edit** link carries the watch key next to the edit key: `/g/<id>#k=<editKey>&w=<watchKey>`. A **Watch only** link is unchanged: `#k=<watchKey>`. A device that opens an edit link saves both, as the creator's device and code-upgraded editors already do (`rememberKey(id, key, storage, watchKey)`), so `keysFor` finds a watch key and the Share sheet shows the watch QR. No server, route, schema or stored-record change.

Every device that holds a watch key adds it to the edit links it shows, so the key keeps travelling as edit links are passed on. A device on an edit link made before this change has no watch key and gets a plain explanation (REQ-0007-05, -07).

The iPhone hint (REQ-0007-09) is one sentence added to the notice shown before the first share, when `navigator.standalone === false`. That property exists only in Safari on iPhone and iPad, so no user-agent check is needed.

## 2. Constitution check

| Invariant group           | Complies? | Notes                                                                                                             |
| ------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| Governance (01–03, 16–18) | Yes       | Spec approved before code; tests cite REQ-0007 ids. The owner's approval of the spec covers the ask-first change. |
| Architecture (04–07)      | Yes       | Link building and parsing stay pure in `lib/`; storage in `lib/infra/`; UI text in components.                    |
| Security (08–11)          | Yes       | Keys stay after `#`, are parsed with `KeySchema`, never logged or sent in a URL; server unchanged.                |
| Quality (12–15)           | Yes       | Unit, component, e2e, a11y; QR scan size checked.                                                                 |

## 3. Design

- **Layers touched:** `lib/` (links, hash parsing), `lib/infra/` (none beyond existing `rememberKey`), `app/` (`SharedGameApp`, `ShareControl`), `app/components/` (`ShareSheet` text).
- **Files and modules:**
  - `lib/share-links.ts`: `shareLink(origin, id, key, watchKey?)` appends `&w=` only for edit links; `keysFor` unchanged.
  - `lib/shared-game.ts`: `keyFromHash` becomes `keysFromHash(hash) → { key, watchKey } | null`, accepting `#k=<key>` and `#k=<key>&w=<watch>`. A malformed `w` is ignored, not fatal; a `w` equal to `k` is ignored.
  - `app/SharedGameApp.tsx`: `rememberKey(id, key, undefined, watchKey)` when the link carries one; the address bar is cleaned as today.
  - `app/ShareControl.tsx`: pass the saved watch key into the edit link.
  - `app/components/ShareSheet.tsx`: replace "Only the device that started sharing can show it" with the older-link text from REQ-0007-07.
  - `lib/share-links.ts`: Safari sentence appended to the notice when asked for; `ShareControl` decides with `navigator.standalone === false`.
- **Data model and contracts:** link fragment grows by `&w=<22 chars>`. Storage shape is unchanged (`watchKey` already exists in `chip-ledger.joined.v1`).
- **Control flow:** host shows edit QR (`#k=E&w=W`) → guest opens it → `keysFromHash` → `rememberKey(id, E, W)` → guest's Share sheet: watch QR from W, edit QR `#k=E&w=W`.

## 4. Testing strategy

| Requirement      | Unit                                                   | Component                                        | E2E                                                           | Visual      | A11y            |
| ---------------- | ------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------- | ----------- | --------------- |
| REQ-0007-01, -04 | `shareLink` with/without `w`; `keysFromHash` cases     | ShareControl shows watch for edit-link joiner    | AC-0007-01 (three tabs)                                       | share sheet | axe Share sheet |
| REQ-0007-02      | `keysFor` unchanged                                    | watcher sees Watch only, not Can edit            | AC-0007-03                                                    |             |                 |
| REQ-0007-03      |                                                        |                                                  | AC-0007-04 (route refuses)                                    |             |                 |
| REQ-0007-05, -07 |                                                        | older-link text, no "started sharing" text       | AC-0007-06, -08                                               |             | axe             |
| REQ-0007-06      | stored record has hashes only (existing test extended) |                                                  | AC-0007-05 (log scan)                                         |             |                 |
| REQ-0007-08      |                                                        |                                                  | AC-0007-07 (rev unchanged)                                    |             |                 |
| REQ-0007-09      | notice text with/without the sentence                  | `navigator.standalone` stubbed true/false/absent | AC-0007-09 (`navigator.standalone` stubbed in an init script) |             |                 |

## 5. Risks and mitigations

| Risk                                                                 | Likelihood | Impact | Mitigation                                                                                                               |
| -------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| The longer edit link makes a denser QR that's harder to scan.        | Low        | Medium | About 100 characters at ECC level M; check that the module count still fits the sheet at 320 px and scans on two phones. |
| A hand-edited link puts an edit key in `w`, so the "watch" QR edits. | Low        | Low    | Only someone holding an edit key can do this, and they could share edit access anyway. `w = k` is ignored.               |
| A watch link and an edit link get confused in support conversations. | Low        | Low    | Labels in the sheet are unchanged; only the fragment differs.                                                            |

## 6. Rollout and rollback

Direct release. Old edit links keep working (no `w`). Reverting the PR leaves saved watch keys in storage, which the old code already reads, so a revert is safe.

## 7. Documentation to update

- [ ] Reference docs: `docs/SECURITY_POLICY.md` (what each link carries), `docs/API_PATTERNS.md` (fragment format), and the implementation note in ADR-0005 marked as addressed by SPEC-0007
- [ ] `sdd.yaml`: N/A
- [ ] `.env.example` and `docs/CONFIGURATION.md`: N/A
- [ ] Component docs: `docs/components/ShareSheet.md`
