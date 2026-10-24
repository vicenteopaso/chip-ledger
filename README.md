# chip-ledger

Poker night buy-in and cash-out tracker: set up chip stacks, record rebuys, count chips, and see who pays whom.

## What it does

A single-page web app in four steps:

1. **Setup** — 2 to 10 players (4 by default), their names, the buy-in and currency (38 common ones; amounts in CLP, JPY and similar currencies use whole units), and the chips in each starting stack (color, count, and a value per color, or one "All colors" count and value for all chips). The chips are filled in automatically so the stack equals the buy-in, and follow it when it changes until you edit a chip; if you do make them differ, it warns and computes the cash-out rate.
2. **Table** — tap + for each rebuy; the pot updates.
3. **Cash out** — enter each player's chips; a check compares counted chips with chips issued and with the pot.
4. **Settle** — each player's net and the fewest practical payments, with an option to spread a count mismatch across everyone. Copy the results to paste into a chat.

The game is saved in the browser on the device; nothing is stored on a server. Behavior is specified in [SPEC-0001](./docs/specs/0001-chip-ledger/spec.md); the architecture is explained in [ADR-0004](./docs/adr/0004-chip-ledger-client-architecture.md).

**Photo counting** (count a player's chips from a picture through an OpenAI-compatible vision model such as OpenRouter) is built and tested but **off and hidden by default**. See [Configuration](./docs/CONFIGURATION.md) and SPEC-0001 §7 before turning it on.

## Run it

Requires Node.js (version in [`.nvmrc`](./.nvmrc)) and pnpm through Corepack.

```bash
corepack enable
pnpm install
pnpm dev           # http://localhost:3000
```

Copy `.env.example` to `.env.local` only if you need to change the site URL or enable photo counting.

## Verify

```bash
pnpm verify        # lint + typecheck + unit tests with coverage + build + e2e (what CI runs)
pnpm test:a11y     # axe audits, light and dark themes
pnpm test:visual   # screenshots of every step, both themes, phone and desktop widths
node scripts/check-sdd-refs.mjs && node scripts/check-doc-links.mjs
```

Playwright needs a browser once: `pnpm exec playwright install chromium`. E2E, a11y, and visual tests run against a production build (`pnpm build` first).

## How the code is organized

| Path                | Layer   | What lives there                                                     |
| ------------------- | ------- | -------------------------------------------------------------------- |
| `lib/`              | domain  | Game rules, settlement, schemas, money formatting, photo-count prompt |
| `lib/infra/`        | infra   | Browser storage, clipboard, photo-count client and provider, env      |
| `app/components/`   | ui      | Presentational screens and shared components                          |
| `app/`              | routes  | Page, layout, error pages, and `ChipLedgerApp`, which owns state      |
| `app/api/`          | api     | `POST /api/photo-count` (404 unless enabled)                          |

Layer rules come from [`sdd.yaml`](./sdd.yaml) and are enforced by lint. Details: [Architecture](./docs/ARCHITECTURE.md).

## How this repository works

The repository is spec-driven: the [Constitution](./docs/CONSTITUTION.md) and [`sdd.yaml`](./sdd.yaml) set the rules, [ADRs](./docs/adr/README.md) record decisions, and [feature specs](./docs/specs/README.md) describe behavior before code changes it. Start with [`docs/SDD_GUIDE.md`](./docs/SDD_GUIDE.md) and the [documentation map](./docs/README.md). AI agents start at [`AGENTS.md`](./AGENTS.md).

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security reports: [`SECURITY.md`](./SECURITY.md). Support: [`SUPPORT.md`](./SUPPORT.md).

## License

[MIT](./LICENSE)
