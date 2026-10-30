# StepsNav

The four-step navigation in the page header, drawn as a progress stepper. Any step can be opened at any time.

| Field    | Value                                                         |
| -------- | ------------------------------------------------------------- |
| Location | `app/components/StepsNav.tsx`                                 |
| Type     | Server-compatible component                                   |
| Status   | stable                                                        |
| Spec     | SPEC-0001 (REQ-0001-01), SPEC-0002 (REQ-0002-04, REQ-0002-27) |

## Props

| Prop       | Type                       | Required | Description                 |
| ---------- | -------------------------- | -------- | --------------------------- |
| `current`  | `Screen`                   | Yes      | The step being shown        |
| `onSelect` | `(screen: Screen) => void` | Yes      | Called with the chosen step |

## Accessibility

- **Role / semantics:** `<nav aria-label="Steps">` around an ordered list of native buttons; the current one has `aria-current="step"`. Upcoming and current steps are named by their visible number and label ("2 Table"). Done steps show a check mark in place of the number and are named "<n> <Step> (done)" (`aria-label`, which contains the visible label), so the state is never carried by color alone (REQ-0002-04). The connecting lines and the check mark are `aria-hidden`.
- **Forced colors:** circles are outlined (upcoming), filled with `CanvasText` (done), or `Highlight` (current), and opt out of forcing so the number has no backplate.
- **Keyboard:** `Tab` through the steps; `Enter`/`Space` open one.
- **Touch target:** each step's button fills its quarter of the row and is at least 44 px tall.

## Design tokens

Circles: `--color-accent` and `--color-accent-ink` (done, current), a `--color-accent-soft` halo (current), `--color-border-control` on `--color-surface` (upcoming), all ≥ 3:1 on the page. Layout: the steps span the full content width (end buttons 48 px, middle ones 64 px, `justify-between`), so the circles are evenly spaced with the first and last at the edges. Line: one `--color-border-control` track from the first circle to the last, with a `--color-accent` fill (`.step-progress`) up to the current step. Labels: `--text-md`, `--color-text` (current, bold) or `--color-text-muted`; on hover the label is underlined and the circle gains the halo (done) or an accent outline (upcoming). Hover never draws a box, which the connecting line would cross (REQ-0002-27).

## Testing

`test/unit/app/components/StepsNav.test.tsx`; e2e flows.
