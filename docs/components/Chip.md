# Chip

Casino-chip artwork for one chip color. Decorative: always pair it with a text label.

| Field    | Value                         |
| -------- | ----------------------------- |
| Location | `app/components/Chip.tsx`     |
| Type     | Server-compatible component   |
| Status   | stable                        |
| Spec     | SPEC-0001 (REQ-0001-27)       |

## Props

| Prop        | Type                           | Default | Required | Description                    |
| ----------- | ------------------------------ | ------- | -------- | ------------------------------ |
| `color`     | `StackColor`                   | —       | Yes      | One of the ten palette colors, or `"mixed"` for the multi-color "All colors" chip (REQ-0001-28) |
| `size`      | `"sm" \| "md" \| "lg" \| "xl"` | `"md"`  | No       | 26, 30, 46, or 64 px           |
| `className` | `string`                       | `""`    | No       | Layout utilities (offsets)     |

## Usage

```tsx
<Chip color="red" />
<Chip color="white" size="xl" className="-ml-6.5" />
```

## Accessibility

- **Role / semantics:** `aria-hidden="true"`; it never carries information alone. Every use sits next to the color name or an input labelled with it.
- **Contrast / motion:** decorative; no motion.

## Design tokens

`--color-chip-<color>`, `--color-chip-<color>-spot`, `--color-chip-spot`, `--color-chip-shadow`. Drawn by the `.chip` class in `app/globals.css` from the `data-color` attribute. The `mixed` chip draws a white center and an edge in red, blue, green, and yellow.

## Testing

Rendered in every visual snapshot (`test/visual/screens.spec.ts`).
