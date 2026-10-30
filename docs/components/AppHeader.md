# AppHeader

The page header on every step: the brand mark and "Chip Ledger", then the step navigation. Because it is the same on every step, the content below it starts at the same height and never jumps when the step changes.

| Field    | Value                                                          |
| -------- | -------------------------------------------------------------- |
| Location | `app/components/AppHeader.tsx`, `app/components/BrandMark.tsx` |
| Type     | Server-compatible components                                   |
| Status   | stable                                                         |
| Spec     | SPEC-0002 (REQ-0002-24, REQ-0002-28, REQ-0002-29)              |

## Props

| Component   | Prop        | Type        | Required | Description                            |
| ----------- | ----------- | ----------- | -------- | -------------------------------------- |
| `AppHeader` | `children`  | `ReactNode` | Yes      | The step navigation                    |
| `BrandMark` | `className` | `string`    | No       | Size and layout classes, e.g. `size-9` |

## Usage

```tsx
<AppHeader>
  <StepsNav current={game.screen} onSelect={go} />
</AppHeader>
<main id="main">…</main>
```

## Accessibility

- **Role / semantics:** a `<header>` outside `main`, so it is the page's `banner` landmark. "Chip Ledger" is a paragraph, not a heading: each step's `h1` is the step's name (REQ-0002-24). The skip link still goes to `#main`.
- **Brand mark:** decorative (`aria-hidden`); the wordmark beside it names the app.

## Design tokens

`--color-accent` (chip body), `--color-bg` (spots and ring, so the mark reads in both themes), `--text-2xl`, `--leading-display`, `--tracking-display`, `--container-app`.

## Assets

`app/icon.svg` (favicon) and `app/apple-icon.png` (180 px home-screen icon) are the same chip in the light theme's colors, `#14573F` and `#E9EFEA`. Next.js links both from the page head (REQ-0002-29). Edit the SVG and `BrandMark` together.

## Testing

`test/unit/app/ChipLedgerApp.test.tsx` (header on every step), `test/unit/app/source-checks.test.ts` (icon files), `test/e2e/chip-ledger.spec.ts` (one banner, no content jump, icon links and types), visual snapshots.
