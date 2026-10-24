# Button

The app's native button with its four variants. Use it for every action; use `next/link` for navigation.

| Field    | Value                         |
| -------- | ----------------------------- |
| Location | `app/components/Button.tsx`   |
| Type     | Server-compatible component   |
| Status   | stable                        |
| Spec     | SPEC-0001                     |

## Props

All `<button>` attributes except `type` (always `"button"`) and `className`, plus:

| Prop      | Type                                              | Default | Required | Description  |
| --------- | ------------------------------------------------- | ------- | -------- | ------------ |
| `variant` | `"primary" \| "secondary" \| "danger" \| "link"`  | —       | Yes      | Visual style |

## Usage

```tsx
<Button variant="primary" disabled={!canStart} onClick={start}>Start the game</Button>
<Button variant="danger" onClick={reset}>Start over from scratch</Button>
```

## Accessibility

- **Role / semantics:** native `<button type="button">`; name from its text.
- **Keyboard:** `Tab` reaches it; `Enter`/`Space` activate it.
- **Focus:** global `:focus-visible` ring in `--color-focus`.
- **Contrast / motion:** variants use accent/surface token pairs; press scaling only without reduced motion.

## Design tokens

`--color-accent`, `--color-accent-ink`, `--color-surface`, `--color-border`, `--color-danger`, `--radius-xl`, `--border-control`.

## States

Default, focus-visible, active (scaled), disabled (primary at 45% opacity, still readable).

## Testing

Exercised through `test/unit/app/ChipLedgerApp.test.tsx` and e2e flows.
