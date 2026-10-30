# ReadOnly (context)

Marks a subtree as look-but-don't-touch. The shared controls read it, so a screen does not pass a flag through every layer. Used for a watcher of a shared game; solo play never sets it.

| Field    | Value                                                            |
| -------- | ---------------------------------------------------------------- |
| Location | `app/components/ReadOnly.tsx` (`ReadOnlyContext`, `useReadOnly`) |
| Type     | Client context                                                   |
| Status   | stable                                                           |
| Spec     | SPEC-0003 (REQ-0003-06)                                          |

## Usage

```tsx
<ReadOnlyContext value={true}>
  <TableScreen game={game} money={money} dispatch={noop} />
</ReadOnlyContext>
```

The default is `false`, so a component outside the provider behaves as before.

## What changes inside it

| Control                                                                        | Read-only behavior                                                                         |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `Stepper`                                                                      | Only the number is shown; the − and + buttons are not rendered                             |
| `DraftInput`, Setup name fields                                                | `readOnly` and `aria-readonly="true"`: focusable, selectable, announced                    |
| `Select`, Setup and Settle checkboxes                                          | `disabled`                                                                                 |
| Settle "Share it" radio group                                                  | Replaced by a sentence ("Shared equally. …"), because disabled radios hide which one is on |
| Setup "Fill the chips", "Add a chip color", chip "Remove"; Settle "Start over" | Not rendered                                                                               |

Buttons that only move around or copy ("Back to Setup", "Copy results", the bottom bar) are not affected.

## Accessibility

- A watcher is told in text what they can do (`WatchNotice`); the controls above are never the only signal.
- Read-only fields stay in the tab order so a keyboard user can reach and read them.

## Testing

`test/unit/app/components/ReadOnly.test.tsx` covers each control with and without the provider; `test/a11y/shared-game.spec.ts` runs axe on every watched step in both themes.
