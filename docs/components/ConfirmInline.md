# ConfirmInline

A destructive action that asks for confirmation in place: the trigger button is replaced by a short question with Cancel and a confirm button. Use it for actions that can't be undone; don't use it for routine actions.

| Field    | Value                              |
| -------- | ---------------------------------- |
| Location | `app/components/ConfirmInline.tsx` |
| Type     | Client component                   |
| Status   | stable                             |
| Spec     | SPEC-0002 (REQ-0002-11)            |

## Props

| Prop           | Type                      | Default | Required | Description                                       |
| -------------- | ------------------------- | ------- | -------- | ------------------------------------------------- |
| `triggerLabel` | `string`                  | —       | Yes      | The destructive button shown while closed         |
| `message`      | `string`                  | —       | Yes      | The question shown while open; labels the group   |
| `confirmLabel` | `string`                  | —       | Yes      | The confirm button's text                         |
| `open`         | `boolean`                 | —       | Yes      | Whether the question is shown                     |
| `onOpenChange` | `(open: boolean) => void` | —       | Yes      | Called to open (trigger) or close (Cancel, `Esc`) |
| `onConfirm`    | `() => void`              | —       | Yes      | Runs the action                                   |

`open` is controlled by the caller so that leaving the step can close it. `ChipLedgerApp` clears it in `go()`.

## Usage

```tsx
<ConfirmInline
  triggerLabel="Start over from scratch"
  message="Erase everything? Names, chips, and buy-ins will be cleared."
  confirmLabel="Erase everything"
  open={resetConfirming}
  onOpenChange={setResetConfirming}
  onConfirm={reset}
/>
```

## Accessibility

- **Role / semantics:** closed, a native danger `Button`. Open, a `role="group"` labelled by the question (`aria-labelledby`) holding two native buttons, Cancel first.
- **Keyboard:** `Enter`/`Space` on the trigger opens it; `Esc` on either button, or Cancel, closes it.
- **Focus:** opening moves focus to Cancel, the safe choice; closing returns it to the trigger. Focus never moves on first render.
- **Screen reader:** arriving on Cancel reads the group's question, so no live-region message is needed.

## Design tokens

`--color-danger` (group border, confirm text), `--color-surface`, `--border-control`, `--radius-xl`, plus the `Button` variants.

## Testing

`test/unit/app/ChipLedgerApp.test.tsx` (AC-0002-11): focus on open, `Esc`, Cancel, leaving the step, confirm. `test/e2e/chip-ledger.spec.ts`: the same in a browser. `test/a11y/screens.spec.ts`: axe with it open, in both themes.
