# Stepper

A − value + control in the shared field box, with round − and + keys: the Setup player count and each Table buy-in counter.

| Field    | Value                        |
| -------- | ---------------------------- |
| Location | `app/components/Stepper.tsx` |
| Type     | Server-compatible component  |
| Status   | stable                       |
| Spec     | SPEC-0002 (REQ-0002-13, -19) |

## Props

| Prop             | Type                       | Default    | Required | Description                                       |
| ---------------- | -------------------------- | ---------- | -------- | ------------------------------------------------- |
| `label`          | `string`                   | —          | Yes      | Names the group and the value ("Buy-ins for Ana") |
| `value`          | `number`                   | —          | Yes      | The current value                                 |
| `min`            | `number`                   | —          | Yes      | − is unavailable at or below this                 |
| `max`            | `number`                   | `Infinity` | No       | + is unavailable at or above this                 |
| `decrementLabel` | `string`                   | —          | Yes      | Name of the − button ("Remove a buy-in for Ana")  |
| `incrementLabel` | `string`                   | —          | Yes      | Name of the + button                              |
| `onStep`         | `(delta: 1 \| -1) => void` | —          | Yes      | Called on each press; the caller clamps           |
| `stretch`        | `boolean`                  | `false`    | No       | Fills the row (Setup); otherwise compact (Table)  |

## Usage

```tsx
<Stepper
  label={`Buy-ins for ${name}`}
  value={player.buyins}
  min={0}
  decrementLabel={`Remove a buy-in for ${name}`}
  incrementLabel={`Add a buy-in for ${name}`}
  onStep={(delta) => dispatch({ type: "adjustBuyins", playerId, delta })}
/>
```

## Accessibility

- **Role / semantics:** `role="group"` named by `label`; two native buttons; the value is an `<output>` with `aria-live="off"`.
- **Keyboard:** `Tab` to either button, then `Enter`/`Space`.
- **Focus:** a limit is marked with `aria-disabled`, not `disabled`, so focus stays on the button that reached it (REQ-0002-13).
- **Screen reader:** the value isn't a live region. The page's `LiveAnnouncer` says what changed, with context ("5 players", "Ana: 2 buy-ins, pot $120.00").

## Design tokens

The field box (`FIELD_BOX`: 48 px, `--radius-md`, `--color-border-control`, `--color-surface`) so it reads as a field (REQ-0002-31). Keys: 40 px circles in `--color-accent-soft` (`--color-accent-soft-hover` on hover), `--color-disabled-bg` / `--color-disabled-ink` at a limit.

## Testing

`test/unit/app/components/shared.test.tsx` (AC-0002-19: both directions, limits, the same markup on Setup and Table); container and e2e tests for each screen.

## Read-only

In a [read-only](./ReadOnly.md) subtree (a watched shared game) only the number is shown and the buttons are not rendered.
