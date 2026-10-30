# StepsNav

The four-step navigation at the top of every screen. Any step can be opened at any time.

| Field    | Value                                            |
| -------- | ------------------------------------------------ |
| Location | `app/components/StepsNav.tsx`                    |
| Type     | Server-compatible component                      |
| Status   | stable                                           |
| Spec     | SPEC-0001 (REQ-0001-01), SPEC-0002 (REQ-0002-04) |

## Props

| Prop       | Type                       | Required | Description                 |
| ---------- | -------------------------- | -------- | --------------------------- |
| `current`  | `Screen`                   | Yes      | The step being shown        |
| `onSelect` | `(screen: Screen) => void` | Yes      | Called with the chosen step |

## Accessibility

- **Role / semantics:** `<nav aria-label="Steps">` with native buttons ("1 Setup" … "4 Settle"); the current one has `aria-current="step"`. Done steps show a check mark and are named "<n> <Step> (done)" (`aria-label`, which starts with the visible text), so the state is not carried by the border color alone (REQ-0002-04). In forced-colors mode the current step's border uses `Highlight`.
- **Keyboard:** `Tab` through the steps; `Enter`/`Space` open one.
- **Touch target:** 44 px tall; a negative bottom margin keeps the prototype's spacing.

## Design tokens

`--color-accent` (current), `--color-step-done`, `--color-border`, `--color-text`, `--color-text-muted`, `--text-xs`.

## Testing

`test/unit/app/components/StepsNav.test.tsx`; e2e flows.
