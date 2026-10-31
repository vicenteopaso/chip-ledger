# AppHeader

The page header on every step: the brand mark and "Chip Ledger", then the step navigation. Because it is the same on every step, the content below it starts at the same height and never jumps when the step changes. It stays at the top while the page scrolls and shrinks once it is scrolled: a smaller mark and wordmark, a rule under it, the `action` (Share) left out, and the step names hidden (the numbered circles and line stay, and the names stay for screen readers), so the brand stays in view and the content keeps the room.

| Field    | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Location | `app/components/AppHeader.tsx`, `app/components/BrandMark.tsx`       |
| Type     | `AppHeader` client component (scroll); `BrandMark` server-compatible |
| Status   | stable                                                               |
| Spec     | SPEC-0002 (REQ-0002-24, REQ-0002-28, REQ-0002-29)                    |

## Props

| Component   | Prop        | Type        | Required | Description                                                                     |
| ----------- | ----------- | ----------- | -------- | ------------------------------------------------------------------------------- |
| `AppHeader` | `children`  | `ReactNode` | Yes      | The step navigation                                                             |
| `AppHeader` | `action`    | `ReactNode` | No       | A control at the end of the brand row (Share); hidden while the header is small |
| `BrandMark` | `className` | `string`    | No       | Size and layout classes, e.g. `size-12`                                         |

## Usage

```tsx
<AppHeader>
  <StepsNav current={game.screen} onSelect={go} />
</AppHeader>
<main id="main">…</main>
```

## Accessibility

- **Role / semantics:** a `<header>` outside `main`, so it is the page's `banner` landmark. "Chip Ledger" is a paragraph, not a heading: each step's `h1` is the step's name (REQ-0002-24). The skip link still goes to `#main`.
- **Brand mark:** three chips (blue, green, red) in a cluster; decorative (`aria-hidden`), since the wordmark beside it names the app.

## Design tokens

`--color-chip-blue`, `--color-chip-green`, `--color-chip-red` (bodies), `--color-chip-spot` (spots and rings), `--color-bg` (each chip's outline, so overlaps read in both themes), `--text-4xl` (the wordmark balances the 34 px step title), `--leading-display`, `--tracking-display`, `--container-app`.

## Assets

`app/icon.svg` (favicon) is the same three chips with white outlines, so it reads on light and dark browser tabs; `app/apple-icon.png` (180 px home-screen icon) puts it on the page color `#E9EFEA`. The icon's chip colors must match the tokens; a source check enforces it. Next.js links both from the page head (REQ-0002-29). Edit the SVG and `BrandMark` together.

## Testing

`test/unit/app/ChipLedgerApp.test.tsx` (header on every step), `test/unit/app/source-checks.test.ts` (icon files), `test/e2e/chip-ledger.spec.ts` (one banner, no content jump, icon links and types), visual snapshots.
