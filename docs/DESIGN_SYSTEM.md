# Design System

Shared language for UI: tokens, patterns, and rules. Tokens are the contract between design and code; components consume tokens and never invent values.

Values carried over from the Chip Ledger prototype ([SPEC-0001](./specs/0001-chip-ledger/spec.md) REQ-0001-27), with two contrast fixes noted below.

## 1. Principles

1. **Tokens, not magic numbers.** Color, spacing, type, radius, shadow, and motion come from tokens.
2. **Accessible by construction.** Approved color pairs already meet contrast. Using them is how you stay compliant.
3. **Themeable.** Every token has a value per theme (light, dark, any high-contrast variant).
4. **Consistent patterns.** Reuse an existing component before creating a variant.
5. **Documented.** A component without a doc in `docs/components/` is unfinished.

## 2. Token source of truth

Tokens are defined once in `styles/tokens.css` as a Tailwind `@theme`, so each token is also a utility (`bg-surface`, `text-text-muted`, `rounded-xl`). Tailwind's default palette, type scale, and radii are cleared: only these values exist. Dark values apply under `prefers-color-scheme: dark` unless the root has `data-theme="light"`, and always under `data-theme="dark"`.

### Color roles

Contrast is the lower of the ratios against `bg` and `surface`.

| Role                                           | Light                     | Dark                  | Used for                           | Contrast (light / dark)     |
| ---------------------------------------------- | ------------------------- | --------------------- | ---------------------------------- | --------------------------- |
| `--color-bg`                                   | `#E9EFEA`                 | `#0B261D`             | Page background                    | —                           |
| `--color-surface`                              | `#FFFFFF`                 | `#11342A`             | Cards, fields, outlined buttons    | —                           |
| `--color-sunk`                                 | `#F2F6F3`                 | `#0E2D23`             | Unused since SPEC-0002 REQ-0002-31 | —                           |
| `--color-text`                                 | `#13241C`                 | `#ECF3EE`             | Body text                          | 13.9 / 12.0                 |
| `--color-text-muted`                           | `#56685E`                 | `#9AB2A5`             | Secondary text, placeholders       | 5.1 / 6.0                   |
| `--color-accent`                               | `#14573F`                 | `#43B884`             | Primary actions, links, pot        | 7.3 / 5.4                   |
| `--color-accent-ink`                           | `#FFFFFF`                 | `#06231A`             | Text on accent                     | 8.5 / 6.7 on accent         |
| `--color-border`                               | `#CFDAD2`                 | `#22503F`             | Dividers, card and button outlines | decorative                  |
| `--color-border-control`                       | `#7A8B81`                 | `#5A8A77`             | Text-field and select borders      | 3.1 / 3.5                   |
| `--color-focus`                                | `#9A6E1C`                 | `#E3B95A`             | Focus ring                         | 3.9 / 7.3                   |
| `--color-accent-hover`                         | accent 85% + text         | same mix              | Primary button hover               | accent-ink ≥ 4.5:1          |
| `--color-surface-hover`                        | surface 95% + text        | same mix              | Outline button and step hover      | text ≥ 4.5:1                |
| `--color-accent-soft` / `-hover`               | accent 18% / 26% + bg     | same mix              | Secondary buttons, stepper keys    | text 10.5 / 10.3            |
| `--color-danger-soft` / `-hover`               | danger 8% / 12% + surface | same mix              | Danger buttons                     | danger ≥ 4.5:1              |
| `--color-success-bg`                           | success 12% + surface     | same mix              | Confirmation notices               | text 13.7 / 9.3; icon ≥ 3:1 |
| `--color-disabled-bg` / `--color-disabled-ink` | `#DCE3DE` / `#5F6E66`     | `#1A3D31` / `#8FA89B` | Unavailable controls (no opacity)  | ≥ 3:1                       |
| `--color-success`                              | `#1D7448`                 | `#6CD49C`             | Gains, confirmations               | 4.9 / 7.5                   |
| `--color-danger`                               | `#B0342B`                 | `#F28274`             | Losses, mismatches, destructive    | 5.3 / 5.3                   |
| `--color-warn-bg` / `--color-warn-ink`         | `#FBF1DC` / `#6B4A0E`     | `#3A2F12` / `#F2D58C` | Notes; busy photo status           | 7.2 / 9.2                   |

Pairs that carry meaning are checked against `styles/tokens.css` by `test/unit/styles/tokens.test.ts`, so a changed value cannot silently drop below its ratio. Done steps were first marked by a `--color-step-done` border (SPEC-0002 REQ-0002-04); the progress stepper (REQ-0002-27) replaced it with filled accent circles, so the token was removed.

Contrast fixes against the prototype: text-field borders use `--color-border-control` (the prototype's `#CFDAD2` was 1.2:1), and the busy photo status uses `--color-warn-ink` instead of the focus gold (3.9:1 as text).

Chip artwork colors (`--color-chip-*`) are decorative, identical in both themes, and always paired with a text label. The QR code uses `--color-qr-ink` and `--color-qr-paper`, also identical in both themes: scanners need dark modules on a light plate.

### Typography

| Token                                      | Value                                                              | Use                                         |
| ------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------- |
| `--font-sans`                              | Bricolage Grotesque (self-hosted by `next/font`), system fallbacks | UI and body                                 |
| `--font-mono`                              | `ui-monospace, Menlo, monospace`                                   | Copyable results text                       |
| `--text-xs` … `--text-5xl`                 | 13, 14, 15, 16, 17 (`body`), 18, 19, 20, 22, 24, 34 px             | Type scale (`--text-body` is the body size) |
| `--leading-display` / `--tracking-display` | 1.05 / −0.02em                                                     | Step titles and the pot                     |
| Line height                                | 1.4 body                                                           | Kept from the prototype                     |

### Spacing, radius, borders, motion

- **Spacing:** Tailwind's 4 px base (`--spacing: 0.25rem`); fractional steps (`p-3.5` = 14 px) express the prototype's values without arbitrary pixels.
- **Control language (REQ-0002-31):** three shapes that never overlap. **Fields** (text fields, selects, the stepper) share `FIELD_BOX` from `app/components/Field.ts`: 48 px tall, radius `md`, a `--color-border-control` border on surface. **Buttons** are pills (radius `full`): primary is accent, secondary a soft accent tint, danger a soft danger tint, and only `outline` has a border. **Notices** are tinted panels with a 4 px rule on the left and no full border. Selects draw their own chevron inside the box (`Select`, REQ-0002-32).
- **Page header (REQ-0002-28):** the brand mark and "Chip Ledger", then the step navigation, in one `<header>` on every step, so the content never shifts when the step changes. Below it, every step uses the same title spacing (`PageTitle` top 7, `Lede` bottom 6, `SectionTitle` top 9) (REQ-0002-30).
- **Brand mark:** three chips (blue, green, red) in a cluster, from the chip artwork tokens (`BrandMark`). `app/icon.svg` and `app/apple-icon.png` are the same drawing (REQ-0002-29).
- **Surfaces:** `Card` (radius `xl`, border, surface, padding 4) for grouped content and `ListRow` (bottom rule, padding-block 3) for lists. These are the only two looks (REQ-0002-20).
- **Sizes:** no one-off sizes or arbitrary values in components (REQ-0002-26); `--container-lede` (40ch) sets the intro text's line length. A source check in `test/unit/app/source-checks.test.ts` enforces this, along with the single focus style (REQ-0002-22).
- **Radius:** `sm` 10, `md` 12, `lg` 14, `xl` 16, `2xl` 18 px, `full`.
- **Borders:** `--border-control` (1.5 px) through the `border-control` utility for fields and outlined buttons.
- **Effects:** `--blur-bar` (10 px) for the bottom bar; `--color-chip-shadow` for chip artwork.
- **Bottom bar:** `--bar-clearance` (36 spacing steps) is both the space kept under the content and the page's `scroll-padding-bottom`, so a focused field never lands behind the bar. Under the `short:` variant (`max-height: 30rem`: landscape phones, 200% zoom) the bar is static and scrolls with the page (REQ-0002-10). The bar is compact (48px buttons, 28px footer row) and shrinks further once the page is scrolled.
- **Forced colors:** controls use transparent borders, never none, so forced-colors mode can draw them; step circles are outlined (upcoming), filled with `CanvasText` (done), or `Highlight` (current), and chip artwork keeps its colors next to its text label (REQ-0002-09, REQ-0002-27).
- **Motion:** buttons scale to 0.97 while pressed, only under `prefers-reduced-motion: no-preference`.
- **Hover:** Tailwind's `hover:` applies only on devices that can hover, and only to available controls (`hover:not-disabled:not-aria-disabled:…`). The hover mixes step toward the text color, so one definition darkens in light and lightens in dark (REQ-0002-17).
- **Text size:** controls and hints use at least `--text-md` (15 px), and the footer at least `--text-sm` (14 px) (REQ-0002-16).
- **Touch targets:** 44 px minimum. Where the prototype drew smaller controls (step tabs, remove-chip button), the hit area is enlarged without changing the drawn size.

## 3. Core patterns

Document each in `docs/components/` with the [template](./components/_TEMPLATE.md).

| Pattern    | Rules                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Buttons    | Native `<button>`; primary/secondary/destructive; min 44×44 px target; visible focus; disabled state still readable |
| Links      | Distinguishable without color alone; descriptive text; external links indicated                                     |
| Forms      | Visible labels; helper and error text associated; errors announced; required indicated                              |
| Cards      | Semantic heading; whole-card links implemented with one real link, not nested interactives                          |
| Navigation | Landmark `nav` with label; current page indicated (`aria-current`); keyboard operable menus                         |
| Dialogs    | Focus trap, `Esc` to close, labelled, focus restored on close, scroll locked                                        |
| Feedback   | Status messages via live regions; toasts never the only channel for important info                                  |

## 4. Theming

- Themes switch by attribute or class on the root element; the choice is persisted and respects `prefers-color-scheme` by default.
- Avoid flash of wrong theme: set the theme before first paint.
- Every theme is covered by visual and a11y tests.

## 5. Usage guidelines

**Do:** use tokens; compose existing components; test in all themes and at mobile and desktop widths; keep touch targets ≥ 44 px.
**Don't:** hard-code hex colors or pixel sizes; use inline styles for design values; override focus outlines; build a one-off variant instead of extending the system.

## 6. Component checklist

- [ ] Uses tokens only
- [ ] Keyboard operable; focus visible; correct roles and names
- [ ] Meets contrast in every theme and state
- [ ] Responsive; works at 320 px and with 200% zoom
- [ ] Props typed and minimal; no leaking implementation details
- [ ] Doc written; examples included
- [ ] Unit/component, a11y, and (if visual) visual tests added

## Related

[Accessibility](./ACCESSIBILITY.md) · [Engineering Standards §4](./ENGINEERING_STANDARDS.md) · [Component docs](./components/README.md)
