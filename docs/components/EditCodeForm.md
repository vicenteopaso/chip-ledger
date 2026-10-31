# EditCodeForm

Where a watcher of a shared game types the current edit code to become an editor on this device (SPEC-0003 REQ-0003-09). Shown under the "Watch only" notice; collapsed to **I have an edit code** until opened.

| Field    | Value                             |
| -------- | --------------------------------- |
| Location | `app/components/EditCodeForm.tsx` |
| Type     | Client component                  |
| Status   | stable                            |
| Spec     | SPEC-0003 (REQ-0003-09)           |

## Props

| Prop         | Type                                                                                             | Required | Description                                                       |
| ------------ | ------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------------- |
| `onSubmit`   | `(code) => Promise<{ kind: "upgraded"; editKey } \| { kind: "refused" \| "locked" \| "error" }>` | Yes      | Checks the code with the server (the container makes the request) |
| `onUpgraded` | `(editKey: string) => void`                                                                      | Yes      | Called with this device's new edit key                            |

## Behavior

- The field takes only the letters and numbers a code can have, in capitals, at most 6 (no 0, O, 1, I or L), as they are typed or pasted.
- A wrong, old or replaced code all show the same message, "That code didn't work."; too many wrong tries show "Too many tries. Wait a minute and try again."
- It is never read-only, even on a watcher's read-only page, because it is where a watcher asks to edit.

## Accessibility

- A visible label, `aria-invalid` and `aria-describedby` pointing at the message, which is an alert in text.

## Testing

- `test/unit/app/components/share.test.tsx`, `test/e2e/share.spec.ts`, `test/a11y/shared-game.spec.ts`
