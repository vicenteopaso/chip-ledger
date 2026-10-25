# Roadmap

Planned work that is not scheduled yet. Each item becomes a feature spec ([SDD Guide](./SDD_GUIDE.md)) before any code changes; the notes say what it will touch and what to settle first. Remove an item when its spec is approved.

## TODO

1. **Polish the UI for consistency.**
   - Audit spacing, type sizes, control heights, and states across the four steps and the Setup rows; fold one-off values (for example the 52 px thumbnail, the `w-23` currency select) into tokens.
   - Known gaps to close: name and chip-count fields have hidden labels, not visible ones ([ACCESSIBILITY](./ACCESSIBILITY.md)); the Settle and Cash out screens still use cards with different borders than Setup.
   - Touches `styles/tokens.css`, `app/components/`, visual baselines.
2. **Enable AI-driven chip counting.**
   - The feature is built and tested but off (`PHOTO_COUNT_ENABLED`). Before turning it on in production, settle the items in [SPEC-0001 §7](./specs/0001-chip-ledger/spec.md): bot protection on `/api/photo-count`, a rate limiter shared across server instances, a provider spend cap, and the vision model.
   - Needs a spec and an ADR (new external-service guarantees and secrets handling), plus `.env` values in the hosting platform ([Configuration](./CONFIGURATION.md)).
3. **Reskin the UI with a more modern look.**
   - The design system is token-driven, so a new look should mostly be new values in `styles/tokens.css` and component classes, not new logic.
   - Must keep WCAG 2.1 AA contrast in both themes ([Design System](./DESIGN_SYSTEM.md)) and refresh every visual baseline, macOS and Linux, in the same PR.
4. **Turn the app into a fully offline-capable web app.**
   - Today the game state is already stored on the device, but the page itself needs the network. Add a web app manifest and a service worker that caches the shell, scripts, and the self-hosted font.
   - Settle first: how the per-request CSP nonce (ADR-0004, `proxy.ts`) works with a cached shell, how updates are delivered, and what photo counting does offline (it must stay hidden or fail gracefully).
   - A service worker is a new cross-cutting mechanism, so it needs an ADR and an `sdd.yaml` update (CONSTITUTION-07). The optional `OPT-OFFLINE` invariant in the [Constitution](./CONSTITUTION.md) would then apply.
