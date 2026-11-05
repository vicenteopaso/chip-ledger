# Avatar

A round badge with the first letter of a player's name, beside that name on Table rows and Settle payments. Decorative only: never use it without the name written next to it.

| Field    | Value                       |
| -------- | --------------------------- |
| Location | `app/components/Avatar.tsx` |
| Type     | Server-compatible component |
| Status   | stable                      |
| Spec     | SPEC-0005 (REQ-0005-06)     |

## Props

| Prop       | Type                 | Default   | Required | Description                                           |
| ---------- | -------------------- | --------- | -------- | ----------------------------------------------------- |
| `name`     | `string`             | —         | Yes      | The player's name; the badge shows `initialOf(name)`  |
| `tone`     | `"plain" \| "brass"` | `"plain"` | No       | `brass` marks the player who receives a payment       |
| `optional` | `boolean`            | `false`   | No       | Hidden at 320 px so the name and amount beside it fit |

## Usage

```tsx
<Avatar name={name} optional />
<Avatar name={payment.to} tone="brass" />
```

## Accessibility

- **Role / semantics:** a `span` with `aria-hidden="true"`: the name next to it already says who it is, so screen readers do not hear a stray letter.
- **Contrast:** the letter is `--color-text` on `--color-avatar` (14.5 / 12.6) or `--color-accent-text` on `--color-accent-soft` (≥ 4.5:1), checked by the token test.

## Design tokens

36 px circle, `--text-md` at weight 600; `--color-avatar` with `--color-text` (plain), `--color-accent-soft` with `--color-accent-text` (brass).

## States

None: it does not respond to input.

## Testing

| Level     | File                                                  | Covers                                      |
| --------- | ----------------------------------------------------- | ------------------------------------------- |
| Unit      | `test/unit/lib/game.test.ts`                          | `initialOf`: case, whole characters         |
| Component | `test/unit/app/components/card-room-screens.test.tsx` | Shown on Table and payments, hidden from AT |
| Visual    | `test/visual/screens.spec.ts`                         | Table and Settle, themes × viewports        |

## Notes and gotchas

Players who share a first letter get the same badge (Ana and Alex both show "A"); the written name tells them apart. An empty name shows an empty badge, but names fall back to "Player N" before they reach it.
