# SPEC-0006: Shared games that stay shared

| Field   | Value                                                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | approved                                                                                                                                                                                                                                                            |
| Tier    | 1                                                                                                                                                                                                                                                                   |
| Owner   | @vicenteopaso                                                                                                                                                                                                                                                       |
| Created | 2026-11-13                                                                                                                                                                                                                                                          |
| Related | Amends [SPEC-0003](../0003-shared-live-games/spec.md) REQ-0003-13, -17, -25, -27 (see §4) · [ADR-0005](../../adr/0005-shared-live-games-architecture.md) · [ADR-0007](../../adr/0007-read-limits-per-address-and-game.md) · [plan](./plan.md) · [tasks](./tasks.md) |

## 1. Problem

At the first real game night with shared play (owner report, 2026-11-13), the app worked on the host's phone, but sharing let people down in three ways:

1. **The QR code went missing.** When the host came back to share again, the Share sheet asked for "Create the link". It wasn't clear whether that would reopen the same game or start a new one. It starts a new one. The guests stayed on the first game, so the host's later changes never reached them.
2. **Guests seemed to drop off.** Guests' phones fell behind the host's and showed "Reconnecting" or "Offline" on a working connection.
3. **The device count looked wrong.** "Live · N here" went down while everyone was still at the table.

Diagnosis, from reading the code (it could not be confirmed in production logs: the Hobby plan keeps runtime logs for one hour, and refused reads are not logged):

- **Cause of 1.** Sharing sends the host to the shared game's page, but the copy on the host's device stays where it was. The installed app always opens at the home page, which shows that copy: it looks the same as the shared game but is not shared. Pressing Share there makes a second shared game, and the Games list then shows two games with the same player names.
- **Cause of 2.** Reads of a shared game are limited to 120 a minute per network address. Phones on the same Wi-Fi share one public address. Each phone checks every 2 seconds for a minute after a change (30 checks a minute), so from five phones up some checks are refused. The refused phones back off and show Reconnecting, then Offline. The refusal also asks the phone to wait 60 seconds, but the phone ignores that and tries again sooner, which keeps the limit full.
- **Cause of 3.** A phone counts as connected only while the app is open on it. A locked phone, or one showing another app, drops out after about 90 seconds. The count is correct, but the label "here" makes it read as people leaving.

This matters now because shared play is the reason to bring the app to a table. Each of these problems leads the table back to one person keeping score on one phone.

## 2. Goals and non-goals

**Goals**

- Opening the app brings the host back to the game they were playing, shared or not.
- A device can never make a second shared game from a game it has already shared.
- A full table on one Wi-Fi network follows one game at normal speed without being refused.
- When a check is refused for being too frequent, the device waits as long as the server asks, and the person sees an honest status.
- The connected-devices count says what it actually measures.

**Non-goals** (deliberately out of scope)

- Letting a device that did not create the game show the watch-only link or QR code. Today only hashes of the keys are stored, so this needs a change to the security model, so it is specified in [SPEC-0007](../0007-watch-link-from-any-device/spec.md) (Tier 2).
- Server-sent events or any change to how often devices check (ADR-0005 implementation note).
- Counting phones that are locked or showing another app as connected. Browsers stop the checks for a hidden page, and keeping a background connection open would cost battery and store commands.
- Merging two shared games that were already created by mistake.
- Accounts, sign-in, or removing an editor.

## 3. User stories

| ID    | Priority | Story                                                                                                                                       |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | P1       | As a host, I want the app to open on the game I'm running so that I can show the same QR code again to someone who arrives late.            |
| US-02 | P1       | As a host, I want to be stopped from sharing the same game twice by accident so that everyone at the table stays on one game.               |
| US-03 | P1       | As a guest on the host's Wi-Fi, I want my phone to keep up with the game so that I can trust the numbers I see.                             |
| US-04 | P2       | As anyone at the table, I want the device count to say what it means so that I don't think people have left.                                |
| US-05 | P2       | As the owner, I want refused checks to leave a trace in the logs so that I can tell a limit problem from a network problem after the night. |

## 4. Requirements

### Reopening the right game

- REQ-0006-01: Opening the app at its home address (including from the installed app's icon) MUST show the game this device used last, whether that is the game kept on the device or a shared game, at the step it was last on (REQ-0003-18). A shared game is reopened only while it is active; once it is archived (REQ-0003-19), the home address shows the game kept on the device instead.
- REQ-0006-02: When the game to reopen is a shared game that is not available any more (deleted, or the key no longer works), the app MUST show the game kept on the device instead, and MUST NOT show an error page for it.
- REQ-0006-03: Reopening MUST work with no network when the game to reopen is the one kept on the device, and MUST send no request to the sharing service in that case (REQ-0003-27).
- REQ-0006-04: Choosing the device's own game from the **Games** list MUST still open it, and MUST make it the game that opens next time.
- REQ-0006-15: Every device in a shared game, the host's and every guest's, MUST stay in that game for as long as it is active. A device leaves a shared game only when its person chooses **Leave**, when an editor deletes the game, or when the game is archived; sharing, closing the app, locking the phone, losing the connection, or being refused a check MUST NOT take a device out of the game.

### Not sharing the same game twice

- REQ-0006-05: Once a game has been shared, the game kept on the device MUST be replaced by a new, empty game at Setup, and the shared game MUST become the game that opens next (REQ-0006-01). Nothing is lost: the players, chips and buy-ins are in the shared game.
- REQ-0006-06: Before the first share, the Share sheet MUST say in plain words that this device keeps playing in the shared game, and that the device's own unshared game is cleared so the game is not shared twice (added to the notice of REQ-0003-22).
- REQ-0006-07: The **Games** list MUST NOT show two entries for what the host thinks of as one game: the shared game and the copy it was made from MUST NOT both appear with the same title.

### Following a game on a shared network

- REQ-0006-08: The read limit MUST let at least 12 devices on one network address follow one game, each at the fastest normal check rate (every 2 seconds), without any check being refused. _Amends REQ-0003-25 for joins and reads; the per-client limit stays._
- REQ-0006-09: The server MUST still limit reads per client across all games, so one address cannot read many games fast. The limit for one address across games MUST NOT be lower than the limit for one game. Reads that find no game or carry a wrong key MUST keep the limit that applied before this spec (120 a minute per address), so looking for games is no faster than it was ([ADR-0007](../../adr/0007-read-limits-per-address-and-game.md)).
- REQ-0006-10: When a check is refused for being too frequent, the device MUST wait at least as long as the refusal asks before checking again. The tab becoming visible again, or the connection returning, MUST NOT skip the wait. Reloading the page may make one check; if that is refused, the wait applies again.
- REQ-0006-11: While a device is waiting out a refusal, the status MUST read **Reconnecting** (not **Offline**), and edits made in that time MUST be kept and sent afterwards (REQ-0003-14).
- REQ-0006-12: The server SHOULD log each refused read as a warning with the route and which limit refused it. The log MUST NOT contain the network address, the game key, or the game id in readable form (REQ-0003-24).

### Device count wording

- REQ-0006-13: While live, the status row MUST read "N phones live" ("1 phone live" for one) instead of "Live · N here", so it describes devices with the game open, not people present. Reconnecting and Offline read as today. _Amends REQ-0003-13's wording; the count itself is unchanged._
- REQ-0006-14: The status row MUST let anyone find out, in text, that a locked phone or one showing another app is not counted.

## 5. Acceptance criteria

- AC-0006-01 (REQ-0006-01): Given a host who shared a game and is on Table in it, when they close the app and open it again at the home address, then the shared game opens on Table with the same QR code available from **Share**.
- AC-0006-02 (REQ-0006-01, -04): Given a device whose last-used game is its own game, when the app is opened at the home address, then its own game opens at its last step; given the host then picks a shared game from **Games**, closes the app and opens it again, then the shared game opens.
- AC-0006-03 (REQ-0006-02): Given a device whose last-used game was shared and has since been deleted by another editor, when the app is opened at the home address, then the device's own game opens and no "This game isn't available" page is shown.
- AC-0006-04 (REQ-0006-03): Given a device that never shared, when it is opened at the home address with the network off, then its game opens and no request is made to `/api/games`.
- AC-0006-05 (REQ-0006-05, -06): Given a host on Table in a game kept on the device, when they open **Share**, then the sheet says they keep playing in the shared game; when they press **Create the link**, then the shared game opens on Table, and choosing the device's own game from **Games** shows an empty Setup, whose **Share** offers **Create the link** for a new game.
- AC-0006-06 (REQ-0006-07): Given a host who shared one game, when they open **Games**, then exactly one entry has that game's title.
- AC-0006-07 (REQ-0006-08): Given 12 devices with the same network address, each checking one game every 2 seconds for 3 minutes, then no check is refused.
- AC-0006-08 (REQ-0006-09): Given one network address reading several different games, when it goes over the per-client limit, then further reads get a retry-later answer.
- AC-0006-09 (REQ-0006-10, -11): Given a device whose check is refused with a 60-second wait, then it makes no further check for 60 seconds, including after the tab is hidden and shown again; the status reads Reconnecting; an edit made in that time is saved after the wait.
- AC-0006-10 (REQ-0006-12): Given a refused read, then the server log has one warning naming the route and the limit, and searching the log for the address, the key or the game id finds nothing.
- AC-0006-11 (REQ-0006-13, -14): Given three devices with the game open, then the status row reads "3 phones live", and the note that locked phones are not counted can be reached with the keyboard and a screen reader in both themes.
- AC-0006-12 (REQ-0006-15): Given a host and two guests in an active shared game, when the host shares again, a guest locks their phone for 10 minutes, and the other guest goes offline and comes back, then all three are still in the same game, see the same state, and reopening the app at the home address on any of them opens that game.

## 6. Cross-cutting concerns

- **Accessibility:** The new Share sheet choice (REQ-0006-06) is part of the existing labelled dialog (REQ-0003-28): the added sentence (REQ-0006-06) is plain text before **Create the link**, read in order by screen readers. The status wording (REQ-0006-13) is read by the existing live region; the Live/Reconnecting/Offline announcements (REQ-0003-13) are unchanged. The status row now reads "N phones live" (REQ-0006-13). The note for REQ-0006-14 is reachable by keyboard and has a visible focus state. WCAG 2.1 AA in both themes, at 320 px and 200% zoom, as REQ-0003-30.
- **Security:** This changes a rate limit, which is a security control (`sdd.yaml` autonomy: ask first; `security.rules`: needs an ADR, which is [ADR-0007](../../adr/0007-read-limits-per-address-and-game.md)). Reads move from one limit per address to a limit per address and game, plus a per-address limit across games (REQ-0006-08, -09), so one address still cannot read many games fast. The new limits must be at least as strong as today against scanning for games: a wrong key or unknown game still gets the same 404 (REQ-0003-26), and guessing a 128-bit key stays infeasible at any rate this spec allows. No change to keys, codes, edit limits or creation limits.
- **Privacy:** No new personal data is sent or stored. Which game to reopen is remembered on the device only. Refused-read logs hold no address, key or game id (REQ-0006-12).
- **Performance:** No change to how often devices check, so no change to store commands per device-hour (ADR-0005 addendum). Reopening the last shared game adds no request beyond what opening its page already makes. The home page's JavaScript budget (`sdd.yaml`) must still be met.
- **Error states:** A shared game that can't be reopened falls back to the device's own game without an error (REQ-0006-02). A refused check shows Reconnecting and recovers by itself (REQ-0006-11). Creating a link that fails keeps today's messages ([ShareControl](../../../app/ShareControl.tsx)). Refusals are logged as warnings (REQ-0006-12).
- **i18n / localization:** N/A: OPT-I18N is not adopted; new strings are English like the rest of the app.
- **SEO:** N/A: game pages stay `noindex`; the home page's metadata does not change.

## 7. Open questions

Planning is blocked until every item is resolved or explicitly deferred with a reason.

- Q1, resolved 2026-11-13 by the owner: reopen the last shared game only while it is active (REQ-0006-01).
- Q2, resolved 2026-11-13 by the owner: after sharing, the device's own game becomes a new empty game (REQ-0006-05, -06).
- Q3, resolved 2026-11-13 by the owner: plan for 12 devices on one network (REQ-0006-08); the numbers are set in the plan.
- Q4, resolved 2026-11-13 by the owner: "N phones live" (REQ-0006-13).
- Changed during implementation, 2026-11-13, for the owner to confirm in the implementation PR:
  - `sdd.yaml` requires an ADR to change a rate limit, which the first draft of this spec missed ("ADR: none"). [ADR-0007](../../adr/0007-read-limits-per-address-and-game.md) was proposed with the code and accepted by the owner on merge, 2026-11-13. It adds the limit on misses now in REQ-0006-09.
  - REQ-0006-10 said that opening the page again must not skip the wait. A reloaded page has nothing to show until its first check, so holding that check back would leave it blank for up to a minute. A reload now makes one check, and a refusal starts the wait again.
  - While the home address is opening the last shared game, it says "Opening your game…" instead of briefly showing the device's own game (REQ-0006-01).
- Q5, resolved 2026-11-13 by the owner: specified separately as [SPEC-0007](../0007-watch-link-from-any-device/spec.md); it stays a non-goal here.

## 8. References

- Owner report after the first shared game night, 2026-11-13 (this conversation; no issue filed).
- [SPEC-0003](../0003-shared-live-games/spec.md) and [ADR-0005](../../adr/0005-shared-live-games-architecture.md), including the implementation note on watch links.
- Code read for the diagnosis: [app/api/games/\_lib.ts](../../../app/api/games/_lib.ts) (read limiter), [app/useSharedGame.ts](../../../app/useSharedGame.ts) (checks and back-off), [app/ShareControl.tsx](../../../app/ShareControl.tsx) and [app/ChipLedgerApp.tsx](../../../app/ChipLedgerApp.tsx) (sharing from the device's own game), [lib/seo.ts](../../../lib/seo.ts) (installed app opens at `/`).
