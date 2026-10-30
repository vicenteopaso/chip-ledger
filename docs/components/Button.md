# Button

The app's native button with its four variants. Use it for every action; use `next/link` for navigation.

| Field    | Value                                   |
| -------- | --------------------------------------- |
| Location | `app/components/Button.tsx`             |
| Type     | Server-compatible component             |
| Status   | stable                                  |
| Spec     | SPEC-0001, SPEC-0002 (REQ-0002-08, -09) |

## Props

All `<button>` attributes except `type` (always `"button"`) and `className`, plus:

| Prop      | Type                                             | Default | Required | Description  |
| --------- | ------------------------------------------------ | ------- | -------- | ------------ |
| `variant` | `"primary" \| "secondary" \| "danger" \| "link"` | —       | Yes      | Visual style |

## Usage

```tsx
<Button variant="primary" aria-disabled={!canStart} aria-describedby="setup-summary" onClick={start}>
  Start the game
</Button>
<Button variant="danger" onClick={reset}>Start over from scratch</Button>
```

## Accessibility

- **Role / semantics:** native `<button type="button">`; name from its text.
- **Keyboard:** `Tab` reaches it; `Enter`/`Space` activate it.
- **Focus:** global `:focus-visible` ring in `--color-focus`.
- **Contrast / motion:** variants use accent/surface token pairs; press scaling only without reduced motion.
- **Unavailable actions:** prefer `aria-disabled` with `aria-describedby` pointing at the reason over `disabled`, so keyboard and screen-reader users can reach the button and learn why (REQ-0002-08). The handler must then do nothing harmful, for example move focus to the field to fix.
- **Forced colors:** the primary variant has a transparent border rather than none, so forced-colors mode draws its edge (REQ-0002-09).

## Design tokens

`--color-accent`, `--color-accent-ink`, `--color-surface`, `--color-border`, `--color-danger`, `--radius-xl`, `--border-control`.

## States

Default, focus-visible, active (scaled), disabled or `aria-disabled` (primary at 45% opacity, still readable).

## Testing

Exercised through `test/unit/app/ChipLedgerApp.test.tsx` and e2e flows.
