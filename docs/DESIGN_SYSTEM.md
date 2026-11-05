# Design System

Shared language for UI: tokens, patterns, and rules. Tokens are the contract between design and code; components consume tokens and never invent values.

Values from the **Card Room** identity ([SPEC-0005](./specs/0005-card-room-reskin/spec.md)): a dark card room, felt green behind the most important number, brass for the one action that moves the game forward, Geist for text and Geist Mono for money. It replaced the prototype's green look (SPEC-0001 REQ-0001-27).

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

| Role                                           | Light                         | Dark                  | Used for                                      | Contrast (light / dark)          |
| ---------------------------------------------- | ----------------------------- | --------------------- | --------------------------------------------- | -------------------------------- |
| `--color-bg`                                   | `#F3F1EC`                     | `#0D0E10`             | Page background (the room)                    | —                                |
| `--color-surface`                              | `#FFFFFF`                     | `#16181B`             | Panels, cards, fields, secondary buttons      | —                                |
| `--color-sunk`                                 | `#ECE8DF`                     | `#121417`             | Recessed boxes in the Share sheet             | —                                |
| `--color-text`                                 | `#17181B`                     | `#EDEAE3`             | Body text                                     | 15.7 / 14.8                      |
| `--color-text-muted`                           | `#62646A`                     | `#9B9DA1`             | Secondary text, placeholders                  | 5.2 / 6.5                        |
| `--color-accent`                               | `#A5803A`                     | `#CDAA63`             | Brass fill: primary buttons, + key, step bars | 3.2 / 8.1 (graphics)             |
| `--color-accent-ink`                           | `#17130A`                     | `#17130A`             | Text on brass                                 | 5.1 / 8.4 on accent              |
| `--color-accent-text`                          | `#7A5C1E`                     | `#CDAA63`             | Brass as text or an icon: links, check marks  | 5.5 / 8.1                        |
| `--color-felt` / `-ink` / `-muted`             | `#134A37` / white / `#CFE0D6` | `#0F3A2B` / same      | The pot panel (once per screen)               | ink 10.2 / 12.6; muted 7.4 / 9.2 |
| `--color-avatar`                               | `#ECE8DF`                     | `#23262B`             | Decorative player initials                    | text 14.5 / 12.6                 |
| `--color-border`                               | `#E2DED5`                     | `#2C3036`             | Dividers, panel and secondary-button edges    | decorative                       |
| `--color-border-control`                       | `#8C8A84`                     | `#6B7078`             | Field borders, − key, later steps' bars       | 3.1 / 3.6                        |
| `--color-focus`                                | `#7A5C1E`                     | `#F2D58C`             | Focus ring                                    | 5.5 / 12.4                       |
| `--color-accent-hover`                         | accent 82% + surface          | same mix              | Brass hover (its ink is dark in both themes)  | accent-ink ≥ 4.5:1               |
| `--color-surface-hover`                        | surface 95% + text            | same mix              | Secondary, outline, and − key hover           | text ≥ 4.5:1                     |
| `--color-accent-soft` / `-hover`               | accent 18% / 26% + bg         | same mix              | Setup stepper keys, payee initials            | text ≥ 4.5:1                     |
| `--color-danger-soft` / `-hover`               | danger 8% / 12% + surface     | same mix              | Danger buttons                                | danger ≥ 4.5:1                   |
| `--color-success-bg`                           | success 12% + surface         | same mix              | Confirmation notices                          | text ≥ 4.5:1; icon ≥ 3:1         |
| `--color-disabled-bg` / `--color-disabled-ink` | `#E4E0D7` / `#66645E`         | `#202327` / `#8B8E93` | Unavailable controls (no opacity)             | 4.5 / 4.8                        |
| `--color-success`                              | `#1D7448`                     | `#6FCF97`             | Gains, confirmations, gain bars               | 5.1 / 9.4                        |
| `--color-danger`                               | `#B0342B`                     | `#F08A7E`             | Losses, mismatches, destructive, loss bars    | 5.5 / 7.3                        |
| `--color-warn-bg` / `--color-warn-ink`         | `#F8EED6` / `#6B4A0E`         | `#2A2312` / `#F2D58C` | Notes; busy photo status                      | 7.0 / 10.9                       |

Pairs that carry meaning are checked against `styles/tokens.css` by `test/unit/styles/tokens.test.ts`, so a changed value cannot silently drop below its ratio. Light brass is split in two: the fill (`accent`, 3.2:1, enough for bars and button shapes) and a deeper shade for text (`accent-text`, 5.5:1). Step bars use brass up to the current step and the control border after it, so every state is at least 3:1 (SPEC-0005 REQ-0005-04).

Chip artwork colors (`--color-chip-*`) are decorative, identical in both themes, and always paired with a text label. The QR code uses `--color-qr-ink` and `--color-qr-paper`, also identical in both themes: scanners need dark modules on a light plate.

### Typography

| Token                                      | Value                                                      | Use                                       |
| ------------------------------------------ | ---------------------------------------------------------- | ----------------------------------------- |
| `--font-sans`                              | Geist (self-hosted by `next/font`), system fallbacks       | UI and body; titles at weight 600         |
| `--font-mono`                              | Geist Mono (self-hosted by `next/font`), system monospace  | Money in lists and results; copy fallback |
| `--text-xs` … `--text-6xl`                 | 13, 14, 15, 16, 17 (`body`), 18, 19, 20, 22, 24, 34, 44 px | Type scale; 44 px is the pot on the felt  |
| `--leading-display` / `--tracking-display` | 1.05 / −0.03em                                             | Step titles and the pot                   |
| `--tracking-label`                         | 0.14em                                                     | Small upper-case labels (the pot's)       |
| Line height                                | 1.4 body                                                   | Kept from the prototype                   |

### Spacing, radius, borders, motion

- **Spacing:** Tailwind's 4 px base (`--spacing: 0.25rem`); fractional steps (`p-3.5` = 14 px) express the prototype's values without arbitrary pixels.
- **Control language (REQ-0002-31):** three shapes that never overlap. **Fields** (text fields, selects, the stepper) share `FIELD_BOX` from `app/components/Field.ts`: 48 px tall, radius `md`, a `--color-border-control` border on surface. **Buttons** are rounded rectangles (radius `lg`, SPEC-0005 REQ-0005-14): primary is brass, secondary is the surface with the decorative panel border, danger a soft danger tint, and `outline` a brass border. Only fields carry the 3:1 control border, so a button never looks like a field. **Notices** are tinted panels with a 4 px rule on the left and no full border. Selects draw their own chevron inside the box (`Select`, REQ-0002-32).
- **Page header (REQ-0002-28):** the brand mark and "Chip Ledger", then the step navigation, in one `<header>` on every step, so the content never shifts when the step changes. Below it, every step uses the same title spacing (`PageTitle` top 7, `Lede` bottom 6, `SectionTitle` top 9) (REQ-0002-30).
- **Brand mark:** one brass chip: a rim, eight edge spots, and a solid center in `--color-accent`, so it follows the theme (`BrandMark`). `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, and the manifest icons in `public/icons/` are the same drawing on the dark room color; the browser's theme color is each theme's page color (SPEC-0005 REQ-0005-11, -16, -17, -19).
- **Step navigation:** four buttons, each a bar and a name. Bars fill like a progress bar: brass up to the current step (4 px for the current one, 3 px before it), the control border after it. Done steps add a check mark; the number is only in each button's name. Once the header shrinks, only the bars show, still in 44 px buttons (SPEC-0005 REQ-0005-12, -13).
- **Felt and initials:** `FeltPanel` holds a screen's most important number (the pot on Table), at most once per screen. `Avatar` draws a player's initial; it is decorative (`aria-hidden`) and gives its room back to the name at 320 px (REQ-0005-03, -06).
- **Table stepper:** free-standing 44 px circles, − outlined in the control border and + in brass. Setup's stepper keeps the field box (REQ-0005-15).
- **Surfaces:** `Card` (radius `xl`, border, surface, padding 4) for grouped content and `ListRow` (bottom rule, padding-block 3) for lists; `ListPanel` puts list rows on one surface panel with no rule under the last row (Table players, Settle results) (REQ-0002-20).
- **Sizes:** no one-off sizes or arbitrary values in components (REQ-0002-26); `--container-lede` (40ch) sets the intro text's line length. A source check in `test/unit/app/source-checks.test.ts` enforces this, along with the single focus style (REQ-0002-22).
- **Radius:** `sm` 10, `md` 12, `lg` 14, `xl` 16, `2xl` 18 px, `full`.
- **Borders:** `--border-control` (1.5 px) through the `border-control` utility for fields and outlined buttons.
- **Effects:** `--blur-bar` (10 px) for the bottom bar; `--color-chip-shadow` for chip artwork.
- **Bottom bar:** `--bar-clearance` (36 spacing steps) is both the space kept under the content and the page's `scroll-padding-bottom`, so a focused field never lands behind the bar. Under the `short:` variant (`max-height: 30rem`: landscape phones, 200% zoom) the bar is static and scrolls with the page (REQ-0002-10). The bar is compact (48px buttons, 28px footer row) and shrinks further once the page is scrolled.
- **Forced colors:** controls use transparent borders, never none, so forced-colors mode can draw them; step bars are `GrayText` (later), `CanvasText` (done), or `Highlight` (current), and chip artwork keeps its colors next to its text label (REQ-0002-09, REQ-0005-13).
- **Motion:** buttons scale to 0.97 while pressed, only under `prefers-reduced-motion: no-preference`.
- **Hover:** Tailwind's `hover:` applies only on devices that can hover, and only to available controls (`hover:not-disabled:not-aria-disabled:…`). The surface hover mixes toward the text color, so one definition darkens in light and lightens in dark; brass hovers toward the surface instead, because its ink is dark in both themes (REQ-0002-17).
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
