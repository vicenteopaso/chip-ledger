# Notice

A confirmation (`ok`) or a note (`warn`): the same box for every kind, with an icon and text.

| Field    | Value                                                 |
| -------- | ----------------------------------------------------- |
| Location | `app/components/Notice.tsx`                           |
| Type     | Server-compatible component                           |
| Status   | stable                                                |
| Spec     | SPEC-0001 (REQ-0001-06, -12), SPEC-0002 (REQ-0002-23) |

## Props

| Prop       | Type                                     | Default | Required | Description                                      |
| ---------- | ---------------------------------------- | ------- | -------- | ------------------------------------------------ |
| `notice`   | `{ kind: "ok" \| "warn"; text: string }` | —       | Yes      | Usually from `lib/summaries.ts`                  |
| `children` | `ReactNode`                              | —       | No       | Extra content under the text (Settle's checkbox) |

## Usage

```tsx
<Notice notice={setupSummary(game, money)} />
<Notice notice={{ kind: "warn", text }}>
  <label>…spread the difference…</label>
</Notice>
```

## Accessibility

- **Not color alone:** each kind has its own icon (check mark or exclamation mark) and the same box shape (REQ-0002-23). The icon is `aria-hidden`; the text carries the meaning.
- **Announcements:** a notice is not a live region. When its message changes, the page's `LiveAnnouncer` reads it once (REQ-0002-07).

## Design tokens

A tinted panel with a 4 px rule on the left and no full border, so it never looks like a field or a button (REQ-0002-31). `ok`: `--color-success-bg` panel, `--color-success` rule and icon, `--color-text` text. `warn`: `--color-warn-bg` panel, `--color-warn-ink` rule, icon, and text. Both: `--radius-md` on the right corners, `--text-md`.

## Testing

`test/unit/app/components/shared.test.tsx` (AC-0002-19); summaries in `test/unit/lib/summaries.test.ts`.
