# Card and ListRow

The app's two surfaces: `Card` for grouped content, `ListRow` for one line of a list.

| Field    | Value                         |
| -------- | ----------------------------- |
| Location | `app/components/Surfaces.tsx` |
| Type     | Server-compatible components  |
| Status   | stable                        |
| Spec     | SPEC-0002 (REQ-0002-20)       |

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

Use them for Cash out player cards and payments (`Card`), and for Setup chip rows, Table players, and results (`ListRow`). Don't add visual classes (border, radius, padding, background) through `className`; change the component instead.

## Accessibility

Purely presentational: semantics come from `as` and the content.

## Design tokens

Card: `--radius-xl`, `--color-border`, `--color-surface`, padding 4. Row: `--color-border` bottom rule, padding-block 3.

## Testing

`test/unit/app/components/shared.test.tsx` (AC-0002-19).
