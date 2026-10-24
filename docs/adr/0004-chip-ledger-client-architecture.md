# ADR-0004: Client-side architecture for Chip Ledger

|              |                                                                    |
| ------------ | ------------------------------------------------------------------ |
| **Status**   | Proposed                                                           |
| **Date**     | 2026-10-24                                                         |
| **Deciders** | @vicenteopaso                                                      |
| **Area**     | frontend architecture, security, data                              |
| **Related**  | [SPEC-0001](../specs/0001-chip-ledger/spec.md)                      |

## Context and problem statement

The repository is being turned from a governance template into the Chip Ledger app ([SPEC-0001](../specs/0001-chip-ledger/spec.md)), ported from a single-file prototype. The prototype keeps all state in the browser, re-renders by replacing `innerHTML`, stores the game in `localStorage` without validation, and counts chips from photos through a `window.claude` sampling runtime that only exists when the page is hosted by Claude. The owner wants photo counting rebuilt for an OpenAI-compatible provider (for example OpenRouter) but kept disabled and hidden for now. We must decide how this maps onto the stack and layers in `sdd.yaml` without changing what users see, and record the first real stack choices, the first external service, the first API route, and the security headers.

## Decision drivers

- Behavior and UI parity with the prototype (SPEC-0001 goals).
- Layer contract and framework-agnostic, tested domain logic (CONSTITUTION-04 to -06).
- Schema validation of everything read from outside the app (CONSTITUTION-10).
- No secrets, no new server surface unless needed (CONSTITUTION-08, -09).
- Security headers and a strict CSP (Engineering Standards §6).

## Considered options

1. **Client-side app, browser storage, one flagged server route for photo counting** — game state stays on the device; photo counting goes through `/api/photo-count`, which holds the provider key and is off by default.
2. **Client-side app, photo counting called directly from the browser** — the browser calls the provider with a user- or build-supplied key.
3. **Server-backed app** — games stored server-side, plus the photo route.
4. **Keep the single HTML file** — host it as a static asset and add tests around it.

## Decision

**Chosen option:** "Option 1", because it preserves the prototype's behavior (game data never leaves the device) while giving us layered, tested code, and it keeps the provider key on the server. Option 2 would ship the key to every browser (FP-02). Option 3 is a product change (accounts, datastore) nobody asked for. Option 4 cannot meet the layer, lint, or test standards.

Specifics:

- **Rendering.** `app/page.tsx` is a server component that renders the client container. The shell and Setup screen are server-rendered; saved state is applied after hydration.
- **Layers.** `lib/` holds pure game logic, schemas, formatting, and the photo-count prompt, request and reply schemas (no React). `lib/infra/` holds the adapters: game storage (`localStorage`), clipboard, the photo-count client (`fetch` to our route), the OpenAI-compatible vision client (server only), the rate limiter, and validated environment access. `app/components/` holds presentational components (props in, events out; no I/O). A **routes layer** (`app/` outside `components/` and `api/`) holds the page, layout, and the client container that owns state and wires infra to UI. This layer already appears in `docs/ARCHITECTURE.md`; it is added to `sdd.yaml` so lint can enforce it.
- **State.** One `useReducer` with a pure reducer in `lib/`. Transient UI state (photo status, thumbnails, busy flags, copy and reset confirmations) lives in the container, not in module-level variables (FP-14).
- **Storage.** Same key and JSON shape as the prototype (`chip-ledger.v1`) so a saved game format stays stable. Parsed with a Zod schema; invalid data falls back to defaults and is logged.
- **Photo counting.** Off unless `PHOTO_COUNT_ENABLED=true`. When off, the page does not render any photo UI and the route returns 404 before reading the request. When on, the route follows `docs/API_PATTERNS.md`: request ID, same-origin check, per-client rate limit, Zod validation with type and size limits, then the domain builds the prompt, the infra client calls `POST {PHOTO_COUNT_API_BASE_URL}/chat/completions` (default `https://openrouter.ai/api/v1`) with `PHOTO_COUNT_MODEL`, a 60-second timeout, and the key from `PHOTO_COUNT_API_KEY`, and the domain validates the reply. Plain `fetch`, no SDK dependency. The provider is recorded in `sdd.yaml` (`security.external-services`). Before it is enabled in production it needs bot protection, a shared rate limiter, and a provider spend cap (SPEC-0001 §7).
- **Security headers.** Set in `next.config.mjs` (HSTS, nosniff, referrer policy, permissions policy disabling camera, microphone, and geolocation — the photo picker is a file input and needs none of them — and `frame-ancestors 'none'`). The CSP is generated per request in `proxy.ts` with a nonce for Next.js inline scripts (`script-src 'self' 'nonce-…' 'strict-dynamic'`), `img-src 'self' blob: data:` for photo thumbnails, and no third-party origins (the font is self-hosted by `next/font`). This makes the page dynamically rendered.
- **Errors.** `lib/error-logging.ts` is the only place that writes to the console. No error tracker is configured yet; the Sentry variables shipped with the template are removed from `.env.example` and `docs/CONFIGURATION.md` because no code reads them.

### Consequences

**Positive**

- Game math is pure and unit-tested; UI is testable with Testing Library; flows run in Playwright.
- No server state; the only secret is optional and server-only; the only endpoint is off by default.
- Saved state and model replies can no longer crash or corrupt the app.

**Negative**

- Photo counting is dormant code until enabled; it must be kept passing in CI without delivering user value yet.
- The built-in rate limiter is per server instance, so it is not sufficient on its own for a public deployment.
- The rate limiter keeps keyed, bounded state across requests. This is the one exception to the `sdd.yaml` prohibition on shared mutable state, under the keyed-and-bounded alternative in FP-14, and it only runs when photo counting is on.
- A returning user mid-game sees the Setup screen for one frame before saved state is applied (state lives only in the browser).
- The nonce CSP forces dynamic rendering of the single page, so it is not served from a static cache.

**Neutral / to monitor**

- Provider spend and error rate once photo counting is enabled.

## Validation

- `pnpm verify` green, including coverage thresholds in `sdd.yaml`.
- E2E covers every acceptance criterion in SPEC-0001; axe passes in both themes.
- A test asserts the CSP and security headers on the page response.

## Pros and cons of the options

### Option 1 — client app, flagged server route

- Good: parity for game data; key stays server-side; photo feature can be switched on without code changes.
- Bad: one public endpoint to protect once enabled; dormant code to maintain.

### Option 2 — browser calls the provider

- Good: no server route.
- Bad: exposes the key to every visitor; no way to rate-limit or cap spend.

### Option 3 — server-backed app

- Good: games could sync across devices.
- Bad: needs a datastore, accounts, and a privacy story; changes the product.

### Option 4 — keep the HTML file

- Good: zero porting effort.
- Bad: violates the layer, lint, test, and validation standards; untestable.

## Follow-ups

- [x] Update `sdd.yaml` (stack TEMPLATE markers, layers, external services, headers)
- [x] Update affected reference docs (Architecture, Configuration, Design System, Security Policy)
- [x] Enforce layers with `no-restricted-imports` in `eslint.config.mjs`
- [ ] Before enabling photo counting: bot protection, shared rate limiter, provider spend cap, model choice

## References

- Next.js Content Security Policy guide (nonces with Proxy)
- [SPEC-0001](../specs/0001-chip-ledger/spec.md)
