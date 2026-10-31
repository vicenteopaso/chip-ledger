# ShareSheet

The dialog behind the **Share** button (SPEC-0003). It shows a QR code, the same link as text, **Copy link**, the device's share menu where there is one, what the server keeps and for how long, an edit code for editors, and last the **Watch only | Can edit** switch. It is presentational: `app/ShareControl.tsx` owns the requests and the keys.

| Field    | Value                                                                                 |
| -------- | ------------------------------------------------------------------------------------- |
| Location | `app/components/ShareSheet.tsx` (with `QrCode.tsx`; container `app/ShareControl.tsx`) |
| Type     | Client component                                                                      |
| Status   | stable                                                                                |
| Spec     | SPEC-0003 (REQ-0003-02, -03, -08, -22, -28)                                           |

## Props

| Prop               | Type                               | Required | Description                                                                    |
| ------------------ | ---------------------------------- | -------- | ------------------------------------------------------------------------------ |
| `open`             | `boolean`                          | Yes      | Renders nothing while closed                                                   |
| `onClose`          | `() => void`                       | Yes      | Close button and `Esc`                                                         |
| `stage`            | `"intro" \| "creating" \| "ready"` | Yes      | Before a game is shared the sheet asks first and sends nothing                 |
| `problem`          | `string \| null`                   | Yes      | Why creating the link failed, shown as an alert                                |
| `onCreate`         | `() => void`                       | Yes      | "Create the link"                                                              |
| `kind`             | `"watch" \| "edit"`                | Yes      | The chosen link kind; the container resets it to `watch` on every open         |
| `onKindChange`     | `(kind) => void`                   | Yes      | The radio group                                                                |
| `link`, `modules`  | `string \| null`, grid \| `null`   | Yes      | The link and its QR modules, or `null` when this device cannot offer that kind |
| `available`        | `Record<LinkKind, boolean>`        | Yes      | Which kinds this device holds a key for                                        |
| `copied`, `onCopy` | `boolean`, `() => void`            | Yes      | Copy link and its confirmation ("Link copied.")                                |
| `onNativeShare`    | `() => void`                       | No       | Present only where `navigator.share` exists                                    |
| `editCode`         | `{ state, onShow }`                | No       | Present only for an editor: show the code, or ask for a new one                |

## Behavior

- Before sharing (`intro`), the retention notice is shown and nothing is sent until **Create the link** is pressed (REQ-0003-22). Creating stores the host's edit key and watch key on this device and opens the shared game with the sheet already open (`?share=1`, removed from the address).
- The switch is last and is **Watch only** each time the sheet opens. A device that holds only the edit key (a co-host) cannot show the watch link; the sheet says so instead of showing a code. A watcher can offer the watch link but not the edit link.
- The edit code lasts 10 minutes; asking for a new one replaces the old one.

## Accessibility

- `role="dialog"`, `aria-modal`, labelled by its heading. Focus moves to the heading on open, Tab and Shift+Tab stay inside (a radio group counts as one stop), `Esc` or **Close** closes it, and focus returns to **Share**.
- The QR code is an `img` whose text alternative says it is the link written below and points to **Copy link** (REQ-0003-28). The code is dark on a light plate with a quiet zone in every theme (`--color-qr-ink`, `--color-qr-paper`).
- The edit code has an accessible name that spells it letter by letter.

## Testing

- `test/unit/app/components/share.test.tsx`, `test/unit/app/ShareControl.test.tsx`, `test/unit/lib/qr.test.ts`
- `test/e2e/share.spec.ts`, `test/a11y/shared-game.spec.ts`, `test/visual/screens.spec.ts`
