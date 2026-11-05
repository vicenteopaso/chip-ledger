# Card, ListRow, ListPanel, and FeltPanel

The app's surfaces: `Card` for grouped content, `ListRow` for one line of a list, `ListPanel` for list rows on one panel, and `FeltPanel` for a screen's most important number.

| Field    | Value                                                 |
| -------- | ----------------------------------------------------- |
| Location | `app/components/Surfaces.tsx`                         |
| Type     | Server-compatible components                          |
| Status   | stable                                                |
| Spec     | SPEC-0002 (REQ-0002-20), SPEC-0005 (REQ-0005-03, -05) |

## Props

| Prop              | Type                                                           | Default | Required | Description                             |
| ----------------- | -------------------------------------------------------------- | ------- | -------- | --------------------------------------- |
| `as`              | `"div" \| "section" \| "li"` (Card), `"div" \| "li"` (ListRow) | `"div"` | No       | The element, so lists stay real lists   |
| `className`       | `string`                                                       | `""`    | No       | Layout only (flex, grid, gaps, margins) |
| `aria-labelledby` | `string`                                                       | —       | No       | For a `section` card with a heading     |

## Usage

```tsx
<Card as="section" className="my-3.5" aria-labelledby={headingId}>…</Card>
<ListRow as="li" className="grid grid-cols-2 gap-x-3">…</ListRow>
```

Use them for Cash out player cards and payments (`Card`), and for Setup chip rows, Table players, and results (`ListRow`). Table players and Settle results sit in a `ListPanel` (`as="ul"` for results). `FeltPanel` (a `section`) holds the pot on Table and appears at most once per screen. Don't add visual classes (border, radius, padding, background) through `className`; change the component instead.

## Accessibility

Purely presentational: semantics come from `as` and the content.

## Design tokens

Card: `--radius-xl`, `--color-border`, `--color-surface`, padding 4. Row: `--color-border` bottom rule, padding-block 3. ListPanel: `--radius-xl`, `--color-border`, `--color-surface`, padding-inline 4, no rule under the last row. FeltPanel: `--radius-2xl`, `--color-felt` with `--color-felt-ink` (and `--color-felt-muted` for secondary text).

## Testing

`test/unit/app/components/shared.test.tsx` (AC-0002-19), `test/unit/app/components/card-room-screens.test.tsx` (AC-0005-03).
