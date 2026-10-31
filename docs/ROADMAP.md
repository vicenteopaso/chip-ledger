# Roadmap

Planned work that is not scheduled yet. Each item becomes a feature spec ([SDD Guide](./SDD_GUIDE.md)) before any code changes; the notes say what it will touch and what to settle first. Remove an item when its spec is approved. (GitHub Issues are turned off for this repository, so follow-ups are kept here.)

## TODO

1. **Enable AI-driven chip counting.**
   - The feature is built and tested but off (`PHOTO_COUNT_ENABLED`). Before turning it on in production, settle the items in [SPEC-0001 §7](./specs/0001-chip-ledger/spec.md): bot protection on `/api/photo-count`, a rate limiter shared across server instances, a provider spend cap, and the vision model.
   - Needs a spec and an ADR (new external-service guarantees and secrets handling), plus `.env` values in the hosting platform ([Configuration](./CONFIGURATION.md)).
2. **Reskin the UI with a more modern look.**
   - The design system is token-driven, so a new look should mostly be new values in `styles/tokens.css` and component classes, not new logic.
   - Must keep WCAG 2.1 AA contrast in both themes ([Design System](./DESIGN_SYSTEM.md)) and refresh every visual baseline, macOS and Linux, in the same PR.
3. **Turn the app into a fully offline-capable web app.**
   - Today the game state is already stored on the device, but the page itself needs the network. Add a web app manifest and a service worker that caches the shell, scripts, and the self-hosted font.
   - Settle first: how the per-request CSP nonce (ADR-0004, `proxy.ts`) works with a cached shell, how updates are delivered, and what photo counting does offline (it must stay hidden or fail gracefully).
   - A service worker is a new cross-cutting mechanism, so it needs an ADR and an `sdd.yaml` update (CONSTITUTION-07). The optional `OPT-OFFLINE` invariant in the [Constitution](./CONSTITUTION.md) would then apply.
4. **Let a co-host make another watch link.** (From [SPEC-0003](./specs/0003-shared-live-games/spec.md).)
   - Only hashes of keys are stored, so a device that joined by edit link or code cannot show the **Watch only** link; only the device that started sharing can. Add an editor-only route that creates an extra watch key and stores its hash beside the first (capped like the editor list).
   - An API and data-model addition: spec update and ADR note first. Done when any editor can show a Watch only link and existing links keep working.
5. **Revoke an editor, or reset edit access.**
   - A new edit code stops new people joining but does not remove an editor who already has a key; the only fix today is to delete the game. Let an editor invalidate every edit key except their own.
   - Needs a spec change (SPEC-0003 resolved Q3 says there is no reset button).
6. **Scan a game's QR code inside the app.**
   - Joining works with the phone's own camera. A "Scan a code" button in the Games sheet would need camera permission, a decoder (a new dependency, ask first) or `BarcodeDetector`, and a "paste a link" fallback that works with a keyboard and a screen reader.
7. **Keep a history of chip sales.**
   - [ADR-0006](./adr/0006-chip-sales-as-a-per-player-net-amount.md) stores one net number per player, so a mistaken sale is fixed by the reverse sale. If that is awkward in real games, store a bounded list of sales and derive the net from it, with a remove button per sale.
8. **Live updates with server-sent events, only if polling is not enough.**
   - Polling (2 s after a change, then 5 s) met the targets on the free Redis plan; SSE measured about 2.5 times the commands per device-hour and needs reconnecting every 55 s on Vercel's Hobby plan ([ADR-0005](./adr/0005-shared-live-games-architecture.md) addendum). Build it only if updates feel late or the plan changes, and re-measure the budget first.
9. **Add macOS visual baselines** (`*-darwin.png`) for the shared-game, Share, Games and chip-sale pictures, from a Mac run of `pnpm test:visual --update-snapshots` ([Testing](./TESTING.md) §6). CI uses the Linux ones.
10. **Make the header fit on one line at 320 px.**
    - The wordmark wraps onto two lines to make room for the Games and Share icon buttons. Options: a shorter wordmark or the mark alone on narrow screens, or one menu button below a width. Refresh the visual baselines in the same PR.
