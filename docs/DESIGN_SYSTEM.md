# Design System

Shared language for UI: tokens, patterns, and rules. Tokens are the contract between design and code; components consume tokens and never invent values.

> **Template note:** this file defines the structure and rules. Fill the token tables with your brand's values and keep them in sync with the token source (CSS variables or Tailwind theme).

## 1. Principles

1. **Tokens, not magic numbers.** Color, spacing, type, radius, shadow, and motion come from tokens.
2. **Accessible by construction.** Approved color pairs already meet contrast. Using them is how you stay compliant.
3. **Themeable.** Every token has a value per theme (light, dark, any high-contrast variant).
4. **Consistent patterns.** Reuse an existing component before creating a variant.
5. **Documented.** A component without a doc in `docs/components/` is unfinished.

## 2. Token source of truth

Tokens are defined once (default: CSS custom properties in `styles/tokens.css`, mapped into the Tailwind theme). Design tools and docs reference the same names.

### Color roles

Define **roles**, not raw hues. Components reference roles.

| Role                    | Light | Dark | Used for                         | Min contrast against `bg` |
| ----------------------- | ----- | ---- | -------------------------------- | ------------------------- |
| `--color-bg`            |       |      | Page background                  | —                         |
| `--color-surface`       |       |      | Cards, dialogs                   | —                         |
| `--color-text`          |       |      | Body text                        | 4.5:1                     |
| `--color-text-muted`    |       |      | Secondary text                   | 4.5:1                     |
| `--color-accent`        |       |      | Links, primary actions           | 4.5:1 (text), 3:1 (UI)    |
| `--color-border`        |       |      | Dividers, inputs                 | 3:1 for input boundaries  |
| `--color-focus`         |       |      | Focus ring                       | 3:1                       |
| `--color-danger`        |       |      | Errors, destructive actions      | 4.5:1                     |
| `--color-success`       |       |      | Confirmation                     | 4.5:1                     |

Validate pairs with a contrast checker or an automated test; record any exception as an ADR ([conforming alternate](./ACCESSIBILITY.md)).

### Typography

| Token            | Value | Use                    |
| ---------------- | ----- | ---------------------- |
| `--font-sans`    |       | UI and body            |
| `--font-mono`    |       | Code                   |
| `--text-xs`…`--text-4xl` |  | Modular type scale     |
| Line height      | 1.5 body, 1.2–1.3 headings | Readability |

Body text is at least 16 px; allow user zoom; use relative units (`rem`).

### Spacing, radius, shadow, motion

- **Spacing:** a 4 px base scale (`1 = 4px`, `2 = 8px`, …). No arbitrary pixel values in components.
- **Radius:** a small named set (`none`, `sm`, `md`, `lg`, `full`).
- **Shadow/elevation:** 3–4 named levels.
- **Motion:** durations (150/250/400 ms) and easings as tokens. Honor `prefers-reduced-motion`.

## 3. Core patterns

Document each in `docs/components/` with the [template](./components/_TEMPLATE.md).

| Pattern    | Rules                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------ |
| Buttons    | Native `<button>`; primary/secondary/destructive; min 44×44 px target; visible focus; disabled state still readable |
| Links      | Distinguishable without color alone; descriptive text; external links indicated            |
| Forms      | Visible labels; helper and error text associated; errors announced; required indicated     |
| Cards      | Semantic heading; whole-card links implemented with one real link, not nested interactives |
| Navigation | Landmark `nav` with label; current page indicated (`aria-current`); keyboard operable menus |
| Dialogs    | Focus trap, `Esc` to close, labelled, focus restored on close, scroll locked               |
| Feedback   | Status messages via live regions; toasts never the only channel for important info         |

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
