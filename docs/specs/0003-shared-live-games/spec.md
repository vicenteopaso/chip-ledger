# SPEC-0003: Shared live games

| Field   | Value                                                                                                                                                                                                                                                                                              |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status  | implemented                                                                                                                                                                                                                                                                                        |
| Tier    | 2                                                                                                                                                                                                                                                                                                  |
| Owner   | @vicenteopaso                                                                                                                                                                                                                                                                                      |
| Created | 2026-10-30                                                                                                                                                                                                                                                                                         |
| Related | ADR-0005 (to be written; supersedes the "game data never leaves the device" part of [ADR-0004](../../adr/0004-chip-ledger-client-architecture.md)) · amends [SPEC-0001](../0001-chip-ledger/spec.md) REQ-0001-24 and -25 · touches [SPEC-0002](../0002-a11y-ux-polish/spec.md) REQ-0002-11 and -12 |

Numbering: [SPEC-0002](../0002-a11y-ux-polish/spec.md) is the accessibility pass, so this spec takes 0003. Its shared components (`Stepper`, `ConfirmInline`, `LiveAnnouncer`, `Surfaces`) are already in the app.

## 1. Problem

A game of Chip Ledger lives on one phone. Everyone else at the table has to ask the host what their buy-ins are, who is short on the count, and who pays whom. Passing the phone around is slow, and a second person cannot help count chips while the host plays. Players have no way to follow the game on their own device, and no way to let a trusted friend run the books with the host.

The host wants to start a game, fill in the names, show a QR code, and have everyone at the table join the same game on their own device. Changes made on one device should show up on the others without anyone refreshing. The host decides whether joiners can only watch or can also edit, and a watcher who needs to edit should be able to get that access at the table.

## 2. Goals and non-goals

**Goals**

- Share a running game with other devices through a QR code or a link, as the primary way to start a group game.
- Two kinds of link: **watch only** and **can edit**. Everyone who holds an edit link or code has the same rights.
- Let a watcher become an editor on their own device with a short code shown on an editor's device.
- Keep every open device up to date automatically, within a couple of seconds.
- Keep several games alive at once. Starting a new game never ends or changes a game that others are using.
- Archive games that nobody uses, and delete them after a fixed time.
- Keep solo play exactly as it is today: no server involvement unless the host shares.

**Non-goals** (deliberately out of scope)

- Accounts, sign-in, or per-person permissions. Access is by link or code only.
- Removing a single editor, or telling editors apart (Q3).
- Chat, reactions, edit history, undo, or showing who changed what.
- Scanning a QR code from inside the app. Phones scan with their camera app.
- Native apps, push notifications, or email invitations.
- Photo counting changes. When photo counting is on, a counted result is shared like any other count; the photo itself never leaves the device that took it.
- Conflict-free merging of two people typing in the same field at the same moment. The later change wins.

## 3. User stories

| ID    | Priority | Story                                                                                                                                        |
| ----- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| US-01 | P1       | As a host, I want to show a QR code so that everyone at the table opens my game on their phone without typing anything.                      |
| US-02 | P1       | As a host, I want to choose whether people who join can only watch or can also edit, so that I stay in control when I want to.               |
| US-03 | P1       | As a player, I want to see buy-ins, counts, and results update on my phone as the host enters them.                                          |
| US-04 | P1       | As a co-host, I want to enter counts and buy-ins on my own device while the host does the same on theirs, so that cashing out takes minutes. |
| US-05 | P2       | As a watcher, I want to get edit access with a code that someone at the table shows me, so that I can help without asking for a new link.    |
| US-06 | P2       | As a host, I want to start a new game without ending the game other people are still using.                                                  |
| US-07 | P2       | As a player who left the table, I want to open the game again later and see the final results.                                               |
| US-08 | P3       | As a host, I want unused games to clean themselves up, so that names are not kept on a server longer than needed.                            |

## 4. Requirements

### Sharing and links

- REQ-0003-01: A game MUST stay on the host's device only, with no data sent to a server, until the host chooses **Share**.
- REQ-0003-02: **Share** MUST be reachable from every step. It MUST open a sheet showing a QR code, the same link as readable text, a **Copy link** button, and (where the browser supports it) a **Share** button for the device's share menu.
- REQ-0003-03: The sheet MUST end with a two-option switch, **Watch only** and **Can edit**, set to **Watch only** each time the sheet opens. Changing it MUST replace the QR code and link immediately.
- REQ-0003-04: Each link MUST carry an unguessable key of at least 128 bits in the part of the address after `#`, so the key is not sent to the server by the page request. The app MUST remove the key from the address bar after it has been read.
- REQ-0003-05: Opening a link MUST join the game with the access the link grants, and MUST show the game's current state within 3 seconds on a normal connection. Joining MUST NOT change the game.

### Roles

- REQ-0003-06: A watcher MUST NOT be able to change anything in the game. Controls that edit MUST be absent or disabled, with a visible note that the game is watch only, and the server MUST reject any edit from a watcher.
- REQ-0003-07: Every editor MUST have the same rights as every other editor, including the host: change any setting, name, count, or buy-in, start the game, start new games, delete the game, and show the edit code.
- REQ-0003-08: An editor MUST be able to show an **edit code** of 6 characters taken from a set without look-alike characters (no 0/O, 1/I/L). The code MUST expire after 10 minutes and MUST be replaced when an editor asks for a new one, which also invalidates the old one.
- REQ-0003-09: A watcher who enters the current edit code MUST become an editor on that device for that game, without a new link. After 5 wrong codes within a minute, the game MUST refuse further attempts for 1 minute, whoever tries.

### Live updates

- REQ-0003-10: A change made on one device MUST appear on every other open device within 2 seconds for 95% of changes on a normal connection, without the user refreshing.
- REQ-0003-11: Changes to different fields MUST all be kept. Two changes to the same field MUST resolve to the later one. Buy-in increases and decreases MUST add up, not overwrite each other: two people each pressing + once on the same player produce two extra buy-ins.
- REQ-0003-12: A change that arrives from another device MUST NOT replace text the user is currently typing, MUST NOT move focus, and MUST NOT scroll the page.
- REQ-0003-13: Each device MUST show whether it is **Live**, **Reconnecting**, or **Offline**, and how many devices are connected to the game. The status MUST update by itself, and a change from Live to Offline or back MUST be announced to assistive technology.
- REQ-0003-14: When the connection returns, the device MUST catch up to the current state without the user doing anything. Edits an editor makes while offline MUST be kept on the device and sent in order when the connection returns, with a visible "Reconnecting, changes will sync" notice while they wait.

### Steps and starting the game

- REQ-0003-15: While the host has not yet started the game, a device that joins MUST see a "Waiting for the host to start" state instead of an empty or half-filled Setup. Once any editor starts the game, every device MUST move to the table. After that, each device MUST keep its own current step: moving to another step on one device MUST NOT move any other device.

### Several games

- REQ-0003-16: When an editor starts a new game, whether by **New game, same players** or **Start over from scratch**, from a shared game, the app MUST create a separate game on that device and leave the shared game unchanged for everyone else. The new game starts private until shared. _Amends SPEC-0001 REQ-0001-24 and SPEC-0002 REQ-0002-11 and -12 for shared games._
- REQ-0003-17: A device MUST keep a list of the games it has joined or created, show it from a **Games** control, and let the user switch between them and **Leave** a game. Leaving MUST remove the game and its access from that device only.
- REQ-0003-18: A game MUST open at the step it was last used on this device, and one device's work in one game MUST NOT affect its state in another.

### Lifecycle and retention

- REQ-0003-19: A game counts as in use while any device is connected to it and for as long as changes keep arriving. When 24 hours pass with no connected device and no change, the game MUST be archived.
- REQ-0003-20: An archived game MUST still open from its link, read-only for everyone, with a visible "Archived" notice, and MUST offer **Duplicate into a new game**.
- REQ-0003-21: An archived game MUST be deleted from the server 30 days after archiving. Any editor MUST be able to delete a game earlier, after a confirmation that says it is deleted for everyone. After deletion, no player name or count from the game may remain on the server.
- REQ-0003-22: Before the first share, the app MUST tell the host in plain words what is stored and for how long: the game, including names, is kept on a server until 24 hours after last use, then read-only for 30 days, then deleted.

### Safety and limits

- REQ-0003-23: The server MUST validate every request against a schema, accept only the defined kinds of edit, and check the resulting game with the same rules as a saved game. Anything else MUST be rejected with a generic message.
- REQ-0003-24: Link keys and edit codes MUST NOT be stored or logged in a form that can be read back. A leaked log or database MUST NOT reveal how to open or edit a game.
- REQ-0003-25: The server MUST limit game creation per client, edits per game, and joins per client, and MUST cap the stored size of a game. Exceeding a limit MUST give a generic, retry-later message.
- REQ-0003-26: A link to a game that does not exist, was deleted, or has a wrong key MUST show the same generic "This game isn't available" page, with a way to start a new game, so that nobody can learn whether a game exists.

### Solo play

- REQ-0003-27: A game that was never shared MUST behave exactly as today, including saving on the device, working with no network after the page has loaded, and sending no requests to the sharing service.

### Accessibility

- REQ-0003-28: The Share sheet MUST be a labelled dialog: focus moves into it on open, stays inside while open, returns to **Share** on close, and `Esc` closes it. The QR code MUST have a text alternative that points to the link text and **Copy link**. The Watch only / Can edit switch MUST be a labelled radio group operable with the keyboard.
- REQ-0003-29: Changes from other devices MUST be announced in words through the screen's single polite live region ("Ana: 2 buy-ins"), grouped when several arrive together, and never once per keystroke. A device's role (watching or editing) MUST be stated in text, not only by colour or icon.
- REQ-0003-30: The Share sheet, **Games** list, status indicator, and watch-only state MUST meet WCAG 2.1 AA in both themes, at 320 px width and 200% zoom, and stay distinguishable under forced colors.

## 5. Acceptance criteria

- AC-0003-01 (REQ-0003-01, -27): Given a new game that is never shared, when the host plays through all four steps, then no request goes to the sharing service and the game still reloads from the device.
- AC-0003-02 (REQ-0003-02, -03): Given Setup with four named players, when the host presses **Share**, then the sheet shows a QR code, a link, **Copy link**, and the switch set to **Watch only**; when the host selects **Can edit**, then the QR code and link both change.
- AC-0003-03 (REQ-0003-04): Given a link, then the key is after `#`; after the page loads, `location.hash` is empty and the key is not in any request URL recorded by the server.
- AC-0003-04 (REQ-0003-05): Given a watch-only link, when a second browser opens it, then it shows the host's names and buy-in within 3 seconds, and the host's game is unchanged.
- AC-0003-05 (REQ-0003-06): Given a watcher on Table, then the buy-in + and − buttons are not operable and the page states "Watch only"; when a forged edit request from that watcher reaches the server, then it is rejected and the game is unchanged.
- AC-0003-06 (REQ-0003-07, -11): Given two editors on Table with Ana at 1 buy-in, when each presses + for Ana once within the same second, then both devices end showing 3 buy-ins.
- AC-0003-07 (REQ-0003-08, -09): Given a watcher and an editor, when the editor shows the edit code and the watcher enters it, then the watcher's controls become operable; given a code older than 10 minutes, or one replaced by a newer code, then the watcher sees "That code didn't work" and stays a watcher.
- AC-0003-08 (REQ-0003-09): Given 5 wrong codes in a minute, when the sixth, correct code is entered within that minute, then it is also refused, and it works after the minute has passed.
- AC-0003-09 (REQ-0003-10): Given three open devices, when one editor changes a player's name, then the other two show it within 2 seconds in at least 95 of 100 runs.
- AC-0003-10 (REQ-0003-12): Given a device where the user is typing a name in field A, when another device changes field B and field A, then field B updates, the user's typed text and caret stay, and focus does not move.
- AC-0003-11 (REQ-0003-13, -14): Given a connected device, when the network is cut, then within 10 seconds the indicator reads **Offline**, a polite announcement says so, and after the network returns the device shows the other devices' changes without a reload.
- AC-0003-12 (REQ-0003-15): Given a game that is still on Setup, when a watcher joins, then they see "Waiting for the host to start"; when an editor presses **Start the game**, then the watcher's device moves to the table.
- AC-0003-13 (REQ-0003-16, -18): Given two devices in a shared game, when the first presses **New game, same players**, then the first device shows a new private game with the same names and one buy-in each, and the second device still shows the original game unchanged.
- AC-0003-14 (REQ-0003-17): Given a device with two joined games, when the user opens **Games** and switches, then the other game opens at its last step; when the user chooses **Leave** on one, then it disappears from that device and stays available to the other devices.
- AC-0003-15 (REQ-0003-19, -20): Given a shared game with no connected device and no change for 24 hours, then its link shows the game read-only with an "Archived" notice and **Duplicate into a new game**; given a device is connected, then it is not archived however long it stays open.
- AC-0003-16 (REQ-0003-21): Given an archived game 30 days old, then its link shows "This game isn't available"; given an editor deletes a live game, then every other device shows that page and the server holds no names from it.
- AC-0003-17 (REQ-0003-22): Given a host who has never shared, when they press **Share** for the first time, then the retention notice is shown before any data is sent.
- AC-0003-18 (REQ-0003-23): Given an edit request with an unknown kind, a negative buy-in, or a 5 MB body, then the server rejects it with a generic error and the game is unchanged.
- AC-0003-19 (REQ-0003-24): Given the server's stored game record and its logs after a full session, then neither contains a link key or edit code in readable form.
- AC-0003-20 (REQ-0003-25): Given 50 game creations in a minute from one client, then later ones get a retry-later response.
- AC-0003-21 (REQ-0003-26): Given a link with a wrong key, and a link to a deleted game, then both show the same page and the same wording.
- AC-0003-22 (REQ-0003-28): Given the Share sheet is opened with the keyboard, then focus is inside it, Tab stays inside, `Esc` closes it, and focus returns to **Share**; a screen reader reads the QR code's alternative text, which mentions the link.
- AC-0003-23 (REQ-0003-29): Given a watcher using a screen reader, when an editor presses + for Ana, then the watcher hears "Ana: 2 buy-ins" once.
- AC-0003-24 (REQ-0003-30): axe reports no WCAG 2.1 A/AA violations on the sheet, the **Games** list, the watch-only state, and the Archived state, in light and dark, and the visual tests include 320 px width and `forced-colors: active`.

## 6. Cross-cutting concerns

- **Accessibility:** See REQ-0003-28 to -30. The sheet, the **Games** list, and the status indicator reuse the shared components and conventions from SPEC-0002 (focus to the heading on step change, one polite live region per screen, shared focus style, tokens only). Remote changes must not make the live region noisy.
- **Security:** This spec adds the app's first server-held user data and a link-based access model, so it is a security change (CONSTITUTION-08, -10, -17). Access is by possession of an unguessable key. Anyone who holds an edit link or code can edit, by design; the switch defaults to **Watch only**, and codes expire. Rate limits, size caps, schema validation, hashed keys, and generic errors are in REQ-0003-23 to -26. Threats the plan must cover: key leakage through logs and Referer, code guessing, forged edits from watchers, replay of old edits, storage exhaustion by creating many games, and cross-site requests. Human approval is required before merge.
- **Privacy:** Player names (free text, possibly real names) and money amounts are stored on a server for the first time. Purpose: to run the shared game. Retention: 24 hours after last use, then 30 days read-only, then deleted; earlier on an editor's request (REQ-0003-21). Notice before the first share (REQ-0003-22). No accounts, no analytics on game contents, no names in logs. OPT-PRIVACY is a candidate for adoption by the plan.
- **Performance:** The solo page must not get heavier for people who never share: the sharing code loads only when needed. The QR code and live connection add no cost to the first load. Lighthouse budgets in `sdd.yaml` still apply. Load per game is small (a few kilobytes per change, up to 10 devices); the plan must state the expected request volume and the hosting cost it implies.
- **Error states:**
  - Cannot create the shared game: stay private, show "Couldn't share this game. Try again.", keep the local game intact.
  - Link unknown, deleted, or wrong key: the generic page in REQ-0003-26.
  - Connection lost: **Offline** state in REQ-0003-13; edits are kept and sent on reconnect (REQ-0003-14).
  - Rate limited: "Too many tries. Wait a minute."
  - Game archived: read-only notice in REQ-0003-20.
  - Detail goes to server-side logs with a request ID; users see generic messages (CONSTITUTION-11).
- **i18n / localization:** N/A: OPT-I18N is not adopted. New strings are English, like the rest of the app.
- **SEO:** The game pages carry a secret and MUST NOT be indexed or listed: they need `noindex`, must stay out of the sitemap, and must send no referrer. The landing page's metadata is unchanged.

## 7. Open questions

All resolved by the owner on 2026-10-30.

- Resolved (Q1): the shared games are stored in Upstash Redis through the Vercel Marketplace, called over `fetch` with no new npm package. The owner provisions it; the steps are in [plan.md §6](./plan.md). This is the app's first external service that holds user data.
- Resolved (Q2): after the game starts, each device keeps its own current step (REQ-0003-15). The step is no longer part of the shared game state.
- Resolved (Q3): generating a new edit code is the only control over who can edit in this version; it invalidates the previous code (REQ-0003-08). There is no "reset edit access" button.
- Resolved (Q4): 24 hours idle before archiving, 30 days read-only before deletion (REQ-0003-19, -21).
- Resolved (Q5): one small, dependency-free, MIT-licensed QR encoder package may be added (for example `qrcode-generator`). The exact package and version are chosen and justified in the PR that adds it.
- Resolved (Q6): offline edits are kept on the device and sent in order on reconnect, with a visible notice (REQ-0003-14). The plan covers the overwrite risk.
- Resolved (Q7): the switch reads **Watch only** and **Can edit**; help text says "Watch link" and "Co-host link"; the code is the "edit code".

## 8. References

- Request from the owner, 2026-10-30: shared live games with a QR code, watch-only and edit links, an edit code for upgrades, several games at once, and archiving after inactivity.
- [ADR-0004](../../adr/0004-chip-ledger-client-architecture.md), which rejected a server-backed app as a product change; this spec is that product change.
- [SPEC-0001](../0001-chip-ledger/spec.md) · [SPEC-0002](../0002-a11y-ux-polish/spec.md) · [Security Policy](../../SECURITY_POLICY.md) · [API Patterns](../../API_PATTERNS.md)
