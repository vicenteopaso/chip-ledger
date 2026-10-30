# Select

A native `<select>` in the shared field box, with its own chevron inside the box. `FIELD` and `FIELD_BOX` (`app/components/Field.ts`) are the field look every text field, select, and stepper shares.

| Field    | Value                                                  |
| -------- | ------------------------------------------------------ |
| Location | `app/components/Select.tsx`, `app/components/Field.ts` |
| Type     | Server-compatible component; class constants           |
| Status   | stable                                                 |
| Spec     | SPEC-0002 (REQ-0002-06, REQ-0002-31, REQ-0002-32)      |

## Props

`Select` takes every native `<select>` prop, plus:

| Prop        | Type                     | Required | Description                                       |
| ----------- | ------------------------ | -------- | ------------------------------------------------- |
| `className` | `string`                 | No       | Left padding and text size, e.g. `pl-3 text-body` |
| `ref`       | `Ref<HTMLSelectElement>` | No       | Forwarded to the select                           |

## Usage

```tsx
<label htmlFor="currency">Currency</label>
<Select id="currency" className="pl-3 text-body" value={currency} onChange={…}>
  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
</Select>

<input className={`${FIELD} w-full px-3 text-body`} … />
```

## Accessibility

- **Role / semantics:** still a native select (a list box to assistive technology), named by its `<label>`. The chevron is `aria-hidden` and ignores the pointer, so clicks reach the select.
- **Keyboard:** native.
- **Why its own chevron:** each browser places the native arrow differently, some almost outside the control (REQ-0002-32).

## Design tokens

`FIELD_BOX`: 48 px tall, `--radius-md`, `--border-control` in `--color-border-control` (3:1), `--color-surface`. `FIELD` adds `--color-accent` as the focus border. Chevron: `--color-text-muted`, 16 px, inset 10 px from the right.

## Testing

`test/unit/app/components/shared.test.tsx` (control language, Select), visual snapshots.

## Read-only

In a [read-only](./ReadOnly.md) subtree the select is `disabled`.
