# DraftInput

A text input bound to a parsed value (a number, or `null` for "not entered") that keeps what the person is typing — `2.`, `0,` — instead of reformatting on every keystroke.

| Field    | Value                             |
| -------- | --------------------------------- |
| Location | `app/components/DraftInput.tsx`   |
| Type     | Client component                  |
| Status   | stable                            |
| Spec     | SPEC-0001 (REQ-0001-04, -05, -10) |

## Props

All `<input>` attributes except `value`, `defaultValue`, `onChange`, plus:

| Prop            | Type                    | Required | Description                                                   |
| --------------- | ----------------------- | -------- | ------------------------------------------------------------- |
| `value`         | `T`                     | Yes      | Current parsed value from state                               |
| `format`        | `(value: T) => string`  | Yes      | Text shown when the value changes from outside                |
| `parse`         | `(text: string) => T`   | Yes      | Turns typed text into a value                                 |
| `onValueChange` | `(value: T) => void`    | Yes      | Called on every edit with the parsed value                    |
| `ref`           | `Ref<HTMLInputElement>` | No       | Passed to the `<input>`, for moving focus to it (REQ-0002-08) |

## Usage

```tsx
<label htmlFor="buy-in" className="sr-only">Buy-in amount</label>
<DraftInput id="buy-in" inputMode="decimal" value={buyIn} format={String} parse={parseDecimal} onValueChange={setBuyIn} />
```

## Accessibility

- **Role / semantics:** a native text input; label it with `<label htmlFor>` or by wrapping it in a `<label>`. Lint treats it as a control (`controlComponents`).
- **Keyboard / focus:** native.

## States

When `value` changes from outside (reset, photo count, load) and differs from the parsed draft, the text is replaced with `format(value)`.

## Testing

`test/unit/app/components/SetupScreen.test.tsx` (draft text kept while typing), `test/unit/app/ChipLedgerApp.test.tsx` (external updates).
