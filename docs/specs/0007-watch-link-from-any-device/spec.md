# SPEC-0007: Watch link from any device in the game

| Field   | Value                                                                                                                                                                                                                                                                                                                             |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | draft                                                                                                                                                                                                                                                                                                                             |
| Tier    | 1                                                                                                                                                                                                                                                                                                                                 |
| Owner   | @vicenteopaso                                                                                                                                                                                                                                                                                                                     |
| Created | 2026-11-13                                                                                                                                                                                                                                                                                                                        |
| Related | Split out of [SPEC-0006](../0006-shared-game-reliability/spec.md) (Q5) · amends [SPEC-0003](../0003-shared-live-games/spec.md) REQ-0003-02, -03 · follow-up in [ADR-0005](../../adr/0005-shared-live-games-architecture.md) (implementation note) · [plan](./plan.md) · [tasks](./tasks.md) · ADR: none (Tier 1, see §6 Security) |

## 1. Problem

At the first shared game night (owner report, 2026-11-13), inviting more people depended on one phone. Only some devices in a game can show the **Watch only** QR code:

| How the device got into the game                                                              | Can show the watch link today?          | Can show the edit link today? |
| --------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| Created the game (pressed Share)                                                              | Yes                                     | Yes                           |
| Opened a **Watch only** link                                                                  | Yes                                     | No (by design)                |
| Opened a **Watch only** link, then code                                                       | Yes                                     | Yes                           |
| Opened a **Can edit** link                                                                    | **No**                                  | Yes                           |
| Any of the above, after browser data was cleared, or in a different browser on the same phone | No: the device is no longer in the game | No                            |

The server keeps only hashes of the keys (REQ-0003-24), so it cannot give a watch key back to a device that wasn't given one. An editor who joined through a **Can edit** link can invite people only as editors. The Share sheet tells them "Only the device that started sharing can show it". So either the host has to be found, or someone hands out more access than they meant to.

This matters because people arrive at a poker night at different times. Whoever is at the table when they arrive should be able to let them watch.

## 2. Goals and non-goals

**Goals**

- Every device that can edit a game can show its **Watch only** link and QR code, however it joined.
- Showing a watch link never gives anyone more than watch access, and never reveals an edit key.
- The protection of REQ-0003-24 holds: a leaked copy of the store or logs alone is not enough to open a game.

**Non-goals** (deliberately out of scope)

- Letting a watcher show an edit link or an edit code. That would defeat watch-only access (REQ-0003-06).
- Revoking a watch link, or giving each watcher their own link.
- Accounts, sign-in, or removing one editor (ADR-0005 non-goal).
- Getting a device back into a game after its browser data was cleared, without a link. Once this ships, any editor can show the link again (owner, Q2).
- Moving games between Safari and the installed app on iPhone, which keep separate storage. Only a hint is in scope (REQ-0007-09, owner, Q3).

## 3. User stories

| ID    | Priority | Story                                                                                                                                |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| US-01 | P1       | As an editor who joined with a **Can edit** link, I want to show a **Watch only** QR code so that I can invite a latecomer to watch. |
| US-02 | P1       | As a host, I want any editor to be able to invite watchers so that I don't have to be found every time someone arrives.              |
| US-03 | P2       | As a host, I want a watch link shown by another device to give only watch access so that sharing it can't hand out editing.          |

## 4. Requirements

- REQ-0007-01: Every device with edit access to a shared game MUST be able to show the game's **Watch only** link and QR code in the Share sheet, whether it created the game, opened a **Can edit** link, or became an editor with a code (older edit links: REQ-0007-05). _Amends REQ-0003-02 and -03 for editors._
- REQ-0007-02: Every device with watch access MUST still be able to show the **Watch only** link, as today, and MUST still not be able to show an edit link or code (REQ-0003-06).
- REQ-0007-03: A watch link shown by any device MUST open the same game with watch access only. Holding a watch link MUST NOT be enough to work out an edit link or edit key.
- REQ-0007-04: A **Can edit** link handed out after this change MUST give the device that opens it what it needs to show the watch link, with no further step.
- REQ-0007-05: A device that opened a **Can edit** link handed out before this change is not covered: it cannot show the watch link, and the Share sheet says so (REQ-0007-07). No server change is made for these older links (owner, Q1).
- REQ-0007-06: Neither the game record on the server nor any log MUST let someone holding only a copy of them open the game, as a watcher or as an editor (REQ-0003-24, unchanged).
- REQ-0007-07: The Share sheet MUST NOT show "This device doesn't have the watch link" or "Not available on this device" for **Watch only** on a device that opened a **Can edit** link made after this change, or that created the game, or became an editor with a code. A device on an older link (REQ-0007-05) MUST instead be told in plain words that its link is older, and that anyone who joined more recently, or the person who started sharing, can show the **Watch only** code.
- REQ-0007-08: Showing a watch link MUST NOT count as a change to the game, MUST NOT change its revision, and MUST NOT affect when it is archived (REQ-0003-19).
- REQ-0007-09: On iPhone and iPad, when the app is open in Safari rather than as the installed app, the notice before the first share (REQ-0003-22) MUST add one sentence: share from the one you will keep using, because Safari and the installed app keep their games separately.

## 5. Acceptance criteria

- AC-0007-01 (REQ-0007-01, -04): Given a host who shares a game and shows the **Can edit** QR, when a guest opens it and presses **Share** on their phone, then the sheet shows a **Watch only** QR code and link; when a third phone opens that link, then it sees the game as a watcher and has no edit controls.
- AC-0007-02 (REQ-0007-01): Given a watcher who became an editor with a code, when they press **Share**, then both **Watch only** and **Can edit** are available.
- AC-0007-03 (REQ-0007-02): Given a watcher, when they press **Share**, then **Watch only** is available and **Can edit** says it needs edit access, as today.
- AC-0007-04 (REQ-0007-03): Given a watch link shown by a guest's phone, when anyone uses it to send an edit, ask for an edit code, or delete the game, then the server refuses with the same answers as for any watcher.
- AC-0007-05 (REQ-0007-06): Given the stored game record and the server logs after a full session that used AC-0007-01, then neither contains a watch key, edit key or edit code in a form that opens the game.
- AC-0007-06 (REQ-0007-07): Given a device that can edit, then the Share sheet never shows "Only the device that started sharing can show it".
- AC-0007-08 (REQ-0007-05, -07): Given a device that opened a **Can edit** link made before this change, when it presses **Share** and chooses **Watch only**, then the sheet explains that its link is older and who can show the watch code, and the edit link still works.
- AC-0007-09 (REQ-0007-09): Given an iPhone with the app open in Safari, when the host opens **Share** for a game never shared, then the notice includes the Safari/installed-app sentence; given the installed app, then it does not.
- AC-0007-07 (REQ-0007-08): Given a game at revision N, when an editor opens Share and shows the watch link several times, then the game is still at revision N.

## 6. Cross-cutting concerns

- **Accessibility:** No new controls; the existing Share sheet (REQ-0003-28) shows the watch QR where it used to show a "not available" note. Any new explanation (REQ-0007-07) is text, reachable in reading order, and meets WCAG 2.1 AA in both themes, at 320 px and 200% zoom (REQ-0003-30).
- **Security:** This changes what a **Can edit** link carries: it also carries the game's watch key, after `#` like the edit key (REQ-0003-04). Tier 1, not Tier 2, because no one gains access they didn't have: whoever holds an edit link can already read and change the whole game, and the watch key only lets them hand out less access than they hold. A leaked edit link was already worse than a leaked watch link. The server, the stored record, the routes and the key hashing are unchanged, so REQ-0003-24 holds without new work (REQ-0007-06). The rule kept is that access only goes down a level: edit access can give watch access, watch access can't give edit access (REQ-0007-02, -03). The longer link must still fit in a QR code that phones scan reliably at the size the Share sheet shows. The owner's approval of this spec is the ask-first approval for the change (`sdd.yaml` autonomy).
- **Privacy:** No new personal data. Keys are not personal data, but they are credentials: they stay on the device and in the address after `#` only.
- **Performance:** Showing the watch link makes no request: the key is already on the device. No change to how often devices check the game.
- **Error states:** If the watch link can't be shown (an older link, REQ-0007-05), the sheet says so in plain words and the edit link still works. No new request or log.
- **i18n / localization:** N/A: OPT-I18N is not adopted.
- **SEO:** N/A: game pages are `noindex`; no public page changes.

## 7. Open questions

Planning is blocked until every item is resolved or explicitly deferred with a reason.

- Q1, resolved 2026-11-13 by the owner: new edit links only; the watch key travels in the edit link, no server change (REQ-0007-04, -05). Tier set to 1 as a result.
- Q2, resolved 2026-11-13 by the owner: recovery after cleared browser data is out of scope (§2).
- Q3, resolved 2026-11-13 by the owner: a hint only, in the notice before the first share (REQ-0007-09).

## 8. References

- Owner report after the first shared game night, 2026-11-13; SPEC-0006 Q5.
- [ADR-0005](../../adr/0005-shared-live-games-architecture.md) implementation note: "a route to mint another watch link is a follow-up".
- Code read: [lib/share-links.ts](../../../lib/share-links.ts) (`keysFor`), [lib/infra/joined-games-storage.ts](../../../lib/infra/joined-games-storage.ts) (saved watch key), [lib/infra/secrets.ts](../../../lib/infra/secrets.ts) (hash-only storage), [app/components/ShareSheet.tsx](../../../app/components/ShareSheet.tsx) ("not available" note).
