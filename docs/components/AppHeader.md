# AppHeader

The page header on every step: the brand mark and "Chip Ledger", then the step navigation. Because it is the same on every step, the content below it starts at the same height and never jumps when the step changes. It stays at the top while the page scrolls and shrinks once it is scrolled: a smaller mark and wordmark, a rule under it, the `action` (Share) left out, and the step names hidden (the numbered circles and line stay, and the names stay for screen readers), so the brand stays in view and the content keeps the room.

| Field    | Value                                                                |
| -------- | -------------------------------------------------------------------- |
| Location | `app/components/AppHeader.tsx`, `app/components/BrandMark.tsx`       |
| Type     | `AppHeader` client component (scroll); `BrandMark` server-compatible |
| Status   | stable                                                               |
| Spec     | SPEC-0002 (REQ-0002-24, REQ-0002-28), SPEC-0005 (REQ-0005-11)        |

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
- **Brand mark:** one brass chip; decorative (`aria-hidden`), since the wordmark beside it names the app.

## Design tokens

`--color-accent` (the chip's rim, edge spots, and center, so it follows the theme), `--text-2xl` wordmark at weight 600 with a 36 px mark (`--text-base` and 24 px once shrunk), `--leading-display`, `--tracking-display`, `--container-app`.

## Assets

`app/icon.svg` (favicon) is the same chip in the dark theme's brass on a rounded square of the dark room color, so it reads on light and dark browser tabs; `app/apple-icon.png` (180 px home-screen icon) is the same drawing, rendered from that SVG. The icon's colors must match the dark tokens; a source check enforces it. Next.js links both from the page head (REQ-0005-11). Edit the SVG and `BrandMark` together.

## Testing

`test/unit/app/ChipLedgerApp.test.tsx` (header on every step), `test/unit/app/source-checks.test.ts` (icon files), `test/e2e/chip-ledger.spec.ts` (one banner, no content jump, icon links and types), visual snapshots.
