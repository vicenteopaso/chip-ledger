# StepsNav

The four-step navigation in the page header: a bar and a name per step, filled like a progress bar. Any step can be opened at any time.

| Field    | Value                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Location | `app/components/StepsNav.tsx`                                                       |
| Type     | Server-compatible component                                                         |
| Status   | stable                                                                              |
| Spec     | SPEC-0001 (REQ-0001-01), SPEC-0002 (REQ-0002-04), SPEC-0005 (REQ-0005-04, -12, -13) |

## Props

| Prop       | Type                       | Required | Description                 |
| ---------- | -------------------------- | -------- | --------------------------- |
| `current`  | `Screen`                   | Yes      | The step being shown        |
| `onSelect` | `(screen: Screen) => void` | Yes      | Called with the chosen step |

## Accessibility

- **Role / semantics:** `<nav aria-label="Steps">` around an ordered list of native buttons; the current one has `aria-current="step"`. Every step is named by its number and label ("2 Table", `aria-label`, which contains the visible label); the number is not shown. Done steps add a check mark and are named "<n> <Step> (done)", and the current step has a bold name and a thicker bar, so the state is never carried by color alone (REQ-0002-04, REQ-0005-13). The bars and the check mark are `aria-hidden`.
- **Forced colors:** bars are `GrayText` (later), `CanvasText` (done), or `Highlight` (current), and opt out of forcing so they keep those system colors.
- **Keyboard:** `Tab` through the steps; `Enter`/`Space` open one.
- **Touch target:** each step's button fills its quarter of the row and is at least 44 px tall, also in the shrunk header, where only the bars show (REQ-0005-12).

## Design tokens

Bars: `--color-accent` up to the current step (`h-1`, 4 px, for the current step; 3 px before it) and `--color-border-control` after it, all ≥ 3:1 on the page in both themes (REQ-0005-04). Layout: a four-column grid across the content width; names wrap under themselves at 320 px rather than run into the next step. Labels: `--text-md`, `--color-text` (current, semibold) or `--color-text-muted`; the check mark is `--color-accent-text`. On hover the name is underlined. While the header is shrunk, `.step-label` is visually hidden and only the bars show.

## Testing

`test/unit/app/components/StepsNav.test.tsx`; e2e flows.
