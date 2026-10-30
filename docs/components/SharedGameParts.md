# Shared-game parts

Small components for the page a shared-game link opens (`/g/[id]`, `SharedGameApp`). Each is presentational: props in, nothing else.

| Component          | Location                              | Shows                                                                                | Spec                  |
| ------------------ | ------------------------------------- | ------------------------------------------------------------------------------------ | --------------------- |
| `ConnectionStatus` | `app/components/ConnectionStatus.tsx` | "Live · 3 here", "Reconnecting…", or "Offline. Showing the last version."            | REQ-0003-13           |
| `WatchNotice`      | `app/components/WatchNotice.tsx`      | What this device can do: watch only, edit access not yet available here, or archived | REQ-0003-06, -20, -29 |
| `WaitingForHost`   | `app/components/WaitingForHost.tsx`   | "Waiting for the host" until the game starts                                         | REQ-0003-15           |
| `GameUnavailable`  | `app/components/GameUnavailable.tsx`  | One page for every game that cannot be opened, with a link to start a new one        | REQ-0003-26           |

## Props

| Component                           | Props                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `ConnectionStatus`                  | `status: "live" \| "reconnecting" \| "offline"`, `online: number \| null` |
| `WatchNotice`                       | `access: "watch" \| "edit"`, `archived: boolean`                          |
| `WaitingForHost`, `GameUnavailable` | none                                                                      |

The status text comes from `lib/shared-game-sync.ts` (`statusText`), the same module that says what the live region announces on a change (`statusAnnouncement`).

## Accessibility

- The words carry the meaning. The status dot is `aria-hidden` and never the only cue; meaning is not conveyed by color alone (WCAG 1.4.1).
- None of these is a live region. `SharedGameApp` announces connection changes, "The game has started.", and results copied through the page's single `LiveAnnouncer`.
- `WaitingForHost` and `GameUnavailable` render the step title (`PageTitle`), so focus and the document title behave as on every other step.
- `GameUnavailable` names no cause, so nobody can tell a wrong link from a deleted game.

## Design tokens

`bg-success`, `bg-warn-ink`, `bg-text-muted` for the dot; `Notice` and `buttonClasses("primary")` for the rest. No raw values.

## Testing

`test/unit/app/components/shared-game-parts.test.tsx`; the page behavior is in `test/unit/app/SharedGameApp.test.tsx` and `test/e2e/shared-game.spec.ts`.
