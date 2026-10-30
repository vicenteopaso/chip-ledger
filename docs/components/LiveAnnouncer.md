# LiveAnnouncer

The page's single polite live region. Screen readers read its text when it changes; nothing is shown on screen.

| Field    | Value                              |
| -------- | ---------------------------------- |
| Location | `app/components/LiveAnnouncer.tsx` |
| Type     | Server-compatible component        |
| Status   | stable                             |
| Spec     | SPEC-0002 (REQ-0002-07)            |

## Props

| Prop      | Type     | Default | Required | Description                         |
| --------- | -------- | ------- | -------- | ----------------------------------- |
| `message` | `string` | —       | Yes      | Text to announce; `""` says nothing |

## Usage

```tsx
<LiveAnnouncer message={message} />
```

`ChipLedgerApp` renders it once, outside `<main>`, from the first paint, and sets the text:

| Event                              | Message                                                |
| ---------------------------------- | ------------------------------------------------------ |
| Player count changed               | "5 players"                                            |
| A rebuy added or removed           | "Ana: 2 buy-ins, pot $120.00" (`lib/announcements.ts`) |
| Setup or Cash out summary changed  | The summary text, only when its `code` changes         |
| Photo counting started or finished | "Ana: <photo status>"                                  |
| Results copied, or copying failed  | "Results copied." / the fallback hint                  |

Step changes are not announced here: focus moves to the new step's title, which screen readers read on arrival (REQ-0002-02). Opening the Start over confirmation isn't either: focus moves to its Cancel button, whose group label asks the question (REQ-0002-11).

## Accessibility

- **Role / semantics:** `<p role="status">` (polite, atomic), visually hidden with `sr-only`.
- **Keyboard / focus:** not focusable; never moves focus.
- **Screen reader:** the region must exist before its first message, so it is always rendered, even when empty. Keep it the only live region on the page; other status text (summaries, photo status) is plain text that this region repeats.

## Design tokens

None; it is not visible.

## Testing

`test/unit/app/ChipLedgerApp.test.tsx` (SPEC-0002 phase 1 block) asserts each message; `test/unit/lib/announcements.test.ts` covers the wording.
