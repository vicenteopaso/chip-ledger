# ComponentName

One sentence: what it is and when to use it (and when not to).

| Field     | Value                              |
| --------- | ---------------------------------- |
| Location  | `app/components/ComponentName.tsx` |
| Type      | Server / Client component          |
| Status    | stable / experimental / deprecated |
| Spec      | SPEC-NNNN (if any)                 |

## Props

| Prop       | Type                    | Default | Required | Description          |
| ---------- | ----------------------- | ------- | -------- | -------------------- |
| `children` | `React.ReactNode`       | —       | Yes      | Content              |
| `variant`  | `"primary" \| "secondary"` | `"primary"` | No   | Visual style         |

## Usage

```tsx
<ComponentName variant="primary">Label</ComponentName>
```

## Accessibility

- **Role / semantics:** native element used, or ARIA pattern followed
- **Keyboard:** `Tab` reaches it; `Enter`/`Space` activates; `Esc` closes (if applicable)
- **Focus:** where focus goes on open, close, and error
- **Screen reader:** accessible name source; live regions used
- **Contrast / motion:** tokens guarantee contrast; honors `prefers-reduced-motion`

## Design tokens

List the tokens consumed (color roles, spacing, radius, motion). No raw values.

## States

Default, hover, focus-visible, active, disabled, loading, error, empty — and how each looks and announces.

## Testing

| Level     | File                                  | Covers                         |
| --------- | ------------------------------------- | ------------------------------ |
| Component | `test/unit/ComponentName.test.tsx`    | Props, events, roles           |
| A11y      | `test/a11y/…`                         | axe in each theme              |
| Visual    | `test/visual/…`                       | Themes × viewports             |

## Notes and gotchas

Edge cases, known limitations, and related components.
