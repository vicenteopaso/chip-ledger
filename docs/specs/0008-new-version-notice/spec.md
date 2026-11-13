# SPEC-0008: Tell people when a new version is out

| Field   | Value                                                                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | draft                                                                                                                                           |
| Tier    | 1                                                                                                                                               |
| Owner   | @vicenteopaso                                                                                                                                   |
| Created | 2026-11-13                                                                                                                                      |
| Related | [SPEC-0003](../0003-shared-live-games/spec.md) · [SPEC-0006](../0006-shared-game-reliability/spec.md) · [plan](./plan.md) · [tasks](./tasks.md) |

## 1. Problem

The app is used from the home-screen icon and from Safari tabs that stay open for days. Phones suspend these pages instead of closing them, so a page opened last week keeps running last week's code after a new version is deployed. Nothing tells the person, and nothing asks them to reload.

At a game night this means phones at the same table can run different versions. Fixes such as SPEC-0006 and SPEC-0007 only reach a phone once its page is reloaded. A shared game also depends on every device and the server agreeing on what an edit looks like, so an old page can misbehave against a new server.

The app has no service worker and its pages are rendered per request (ADR-0004), so a reload always gets the current version. What's missing is a reason for people to reload.

## 2. Goals and non-goals

**Goals**

- An open page notices when the deployed version is different from the one it is running, and says so.
- One button reloads the page into the new version without losing anything: the game on the device, the shared game, the step, or edits not yet sent.
- The check is cheap, works the same in the installed app and in Safari, and never gets in the way of solo play offline.

**Non-goals** (deliberately out of scope)

- Offline support or a service worker (OPT-OFFLINE is not adopted).
- Release notes or a changelog inside the app.
- Updating the page without a reload.
- Push notifications when the app is closed.
- Keeping old and new versions working together on the server (Vercel skew protection). REQ-0008-13 covers what happens when they can't.

## 3. User stories

| ID    | Priority | Story                                                                                                                            |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | P1       | As anyone using the installed app or a Safari tab, I want to be told when a new version is out so that I'm not running old code. |
| US-02 | P1       | As an editor in a shared game, I want refreshing to keep my game and my unsent changes so that updating never costs me anything. |
| US-03 | P2       | As the host, I want everyone at the table on the same version so that shared play behaves the same on every phone.               |

## 4. Requirements

### Noticing a new version

- REQ-0008-01: While the app is open and visible, it MUST check whether the deployed version differs from the one the page is running: when the page opens, when it becomes visible again after being hidden, and every 10 minutes while it stays visible.
- REQ-0008-02: It MUST NOT check while the page is hidden.
- REQ-0008-03: "Differs" MUST mean any other deployment, newer or older, so a rollback is offered too.
- REQ-0008-04: A failed check (offline, timeout, error) MUST NOT show anything to the person, MUST NOT affect the connection status of a shared game (REQ-0003-13), and MUST be retried at the next check.
- REQ-0008-05: The check MUST NOT use the shared game store and MUST NOT send any game data, key or player name. A game that was never shared MUST keep working with no network (REQ-0003-27).

### The notice

- REQ-0008-06: When a different version is found, the app MUST show a notice on every step and screen, including shared game pages, the waiting-for-host and archived states, and the "not available" page. It reads "A new version of Chip Ledger is available." and has a **Refresh** button.
- REQ-0008-07: The notice MUST sit in a slim bar directly above the bottom action bar, in thumb reach. It MUST NOT cover the step's main controls or the action bar, MUST NOT push the step's title down, and MUST NOT move focus or scroll the page when it appears.
- REQ-0008-08: The notice MUST stay until the page is refreshed; it has no dismiss control. Because of REQ-0008-07 it never blocks play.

### Refreshing safely

- REQ-0008-09: **Refresh** MUST reload the page into the new version and open the same game at the same step as before (REQ-0003-18).
- REQ-0008-10: If edits to a shared game are still waiting to be sent, **Refresh** MUST first send them. While it waits, the button reads "Saving your changes…". It reloads once they are saved. If they can't be sent because the device is offline, it MUST say so and MUST NOT reload until the person confirms that the unsent changes will be lost.
- REQ-0008-11: Text the person is typing that has not yet been applied to the game MUST be applied before reloading, or the reload MUST wait until the field loses focus.
- REQ-0008-12: After the reload, the notice MUST NOT appear again for the version now running.

### Versions that can no longer work together

- REQ-0008-13: When the server can no longer accept edits from the version a page is running, the server MUST say so in its answer to that page, in a way the page can tell apart from other refusals. The page MUST then pause sending edits and keep them on the device (REQ-0003-14), keep showing and updating the game for watching, and change the notice to "Refresh to keep editing". After **Refresh**, the kept edits MUST be sent by the new version if they are still valid, or dropped with today's "wasn't saved" reason (REQ-0003-23) if not.

## 5. Acceptance criteria

- AC-0008-01 (REQ-0008-01, -06): Given a page open on Table, when a new version is deployed and the page is hidden and shown again, then the notice appears within 5 seconds with a **Refresh** button.
- AC-0008-02 (REQ-0008-01): Given a page left visible on Table, when a new version is deployed, then the notice appears within 10 minutes and 5 seconds.
- AC-0008-03 (REQ-0008-02): Given a hidden page, then it makes no version check until it is shown.
- AC-0008-04 (REQ-0008-03): Given a page running version B, when production is rolled back to version A, then the notice appears.
- AC-0008-05 (REQ-0008-04, -05): Given a game never shared and the network off, then no notice and no error appear, and the game works as before; no request carries game data.
- AC-0008-06 (REQ-0008-09): Given a solo game on Cash out with counts entered, when the person presses **Refresh**, then the new version opens on Cash out with the same counts.
- AC-0008-07 (REQ-0008-09, -10): Given an editor in a shared game with one edit not yet confirmed, when they press **Refresh**, then the button reads "Saving your changes…", the edit is saved, then the page reloads into the new version on the same step, showing the edit.
- AC-0008-08 (REQ-0008-10): Given an editor offline with unsent edits, when they press **Refresh**, then they are told the changes are not sent yet and the page does not reload unless they confirm.
- AC-0008-09 (REQ-0008-12): Given a page just reloaded by **Refresh**, then the notice is not shown.
- AC-0008-11 (REQ-0008-13): Given an editor on an old version whose edits the server no longer accepts, when they make a change, then it shows on their device, is not lost, the game keeps updating from others, and the notice reads "Refresh to keep editing"; after **Refresh**, the change is saved or a "wasn't saved" reason is shown.
- AC-0008-12 (REQ-0008-08): Given the notice is shown, then there is no control to dismiss it, and it stays across step changes until **Refresh**.
- AC-0008-10 (REQ-0008-06, -07): Given each of the four steps, a shared game, and the "not available" page, in both themes at 320 px and at 200% zoom, then the notice is visible, does not cover the action bar, and passes axe.

## 6. Cross-cutting concerns

- **Accessibility:** The notice appears without taking focus and is announced once through the single polite live region (REQ-0003-29): "A new version is available. Refresh to update." **Refresh** is a real button, reachable with the keyboard, with a visible focus state. The waiting state ("Saving your changes…") is announced. Text and button meet 4.5:1 contrast in both themes and stay distinguishable under forced colors. Nothing depends on colour alone.
- **Security:** The check reads one public value: an identifier of the deployment, such as its id or commit. That value is not a secret and gives no access. If a new route is added, it is same-origin, read-only, takes no input, answers with a fixed shape that the client parses with a schema, and is rate-limited like other reads. CSP needs no change: `connect-src 'self'` covers it. No change to keys or the access model.
- **Privacy:** No personal data. The request carries no game, key or name, and nothing is logged beyond normal request logs.
- **Performance:** At most one small request per check, with no store commands (REQ-0008-05). At the agreed interval this is a handful of requests an hour per open page. No change to the first-load JavaScript budget beyond a small component; Lighthouse performance stays ≥ 90.
- **Error states:** A failed check is silent and retried (REQ-0008-04). A refresh blocked by unsent offline edits explains why (REQ-0008-10). A failed reload behaves like any failed page load. Failures are not logged on the client beyond development warnings.
- **i18n / localization:** N/A: OPT-I18N is not adopted.
- **SEO:** N/A: the notice is shown only after a check in the browser, never in the server-rendered page, so crawlers see no change.

## 7. Open questions

Planning is blocked until every item is resolved or explicitly deferred with a reason.

- Q1, resolved 2026-11-13 by the owner: every 10 minutes while visible, plus on open and on return (REQ-0008-01).
- Q2, resolved 2026-11-13 by the owner: the notice can't be dismissed (REQ-0008-08).
- Q3, resolved 2026-11-13 by the owner: pause edits, keep them, and ask to refresh (REQ-0008-13).
- Q4, resolved 2026-11-13 by the owner: a slim bar above the bottom action bar (REQ-0008-07).

## 8. References

- Owner request, 2026-11-13: warn when a new version is deployed, with a button to refresh, for the installed app and Safari.
- [ADR-0004](../../adr/0004-chip-ledger-client-architecture.md) (pages rendered per request, no service worker) · [app/useSharedEditor.ts](../../../app/useSharedEditor.ts) (unsent edits are held in memory only) · [lib/seo.ts](../../../lib/seo.ts) (installed app, `display: standalone`).
