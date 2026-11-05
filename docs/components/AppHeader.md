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

All drawn from the same chip, in the dark theme's brass (`#CDAA63`) on the dark room color (`#0D0E10`) (SPEC-0005 REQ-0005-11, -16, -19):

| File                                 | Use                                           | Drawing                                       |
| ------------------------------------ | --------------------------------------------- | --------------------------------------------- |
| `app/icon.svg`                       | Favicon in current browsers, bookmarks        | Rounded square, chip at 80 %                  |
| `app/favicon.ico`                    | Older browsers and tools that ask for it      | Same, 16, 32, and 48 px PNG frames            |
| `app/apple-icon.png`                 | iPhone and iPad home screen, Safari bookmarks | Full square, chip centered (180 px)           |
| `public/icons/icon-192.png`, `-512`  | Installed app (manifest, `purpose: any`)      | Rounded square, chip at 80 %                  |
| `public/icons/icon-maskable-512.png` | Android adaptive icon (`purpose: maskable`)   | Full bleed, chip at 55 % (in the safe circle) |

The PNG and ICO files are rendered from the SVG drawing; edit `BrandMark`, `app/icon.svg`, and these files together. A source check keeps the SVG's colors equal to the tokens and the PNGs at their sizes; Next.js links the favicons, the Apple icon, and the manifest from the page head. The link-preview image (`app/opengraph-image.tsx`) uses the same mark.

## Testing

`test/unit/app/ChipLedgerApp.test.tsx` (header on every step), `test/unit/app/source-checks.test.ts` (icon files), `test/e2e/chip-ledger.spec.ts` (one banner, no content jump, icon links and types), visual snapshots.
