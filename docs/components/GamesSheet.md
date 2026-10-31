# GamesSheet

The dialog behind the **Games** button (SPEC-0003 REQ-0003-17, -21). It lists the shared games this device has joined or created, and this device's own private game, with a way to open each and to leave a shared one. An editor can also delete the open game for everyone. It is presentational: `app/GamesControl.tsx` reads the list from this device's storage and makes the delete request.

| Field    | Value                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------- |
| Location | `app/components/GamesSheet.tsx` (with `Dialog.tsx`, `HeaderButton.tsx`; container `app/GamesControl.tsx`) |
| Type     | Client component                                                                                          |
| Status   | stable                                                                                                    |
| Spec     | SPEC-0003 (REQ-0003-17, -18, -20, -21, -28)                                                               |

## Props

| Prop                         | Type                                                     | Required | Description                                                          |
| ---------------------------- | -------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `open`, `onClose`            | `boolean`, `() => void`                                  | Yes      | Renders nothing while closed                                         |
| `games`                      | `GameRow[]` (`id`, `title`, `role`, `current`)           | Yes      | Shared games on this device, newest first                            |
| `ownGame`                    | `{ title, current } \| null`                             | Yes      | This device's own private game                                       |
| `onOpenGame`, `onOpenOwn`    | `(id) => void`, `() => void`                             | Yes      | Open another game at its link; it reopens at the step last used here |
| `leaving`, `onLeavingChange` | `string \| null`, `(id \| null) => void`                 | Yes      | The game being asked about; Cancel is focused                        |
| `onLeave`                    | `(id) => void`                                           | Yes      | Takes the game off this device only                                  |
| `remove`                     | `{ confirming, onConfirmingChange, onConfirm, problem }` | No       | Present only for an editor of the open game: delete it for everyone  |

## Behavior

- A game is named by its players ("Ana, Ben and 2 more", or "Game with 4 players" before any name), kept on this device with the game's role and last step. Nothing about it is sent to the server for the list.
- **Leave** asks first and says the game stays for everyone else; it removes the game and its key from this device only (REQ-0003-17). Leaving the game on screen goes to this device's own game.
- **Delete for everyone** uses `ConfirmInline` and says in words that names and counts are removed from the server and nobody can open the game again; then the other devices show "This game isn't available" (REQ-0003-21, -26).
- An archived game is read-only for everyone and shows **Duplicate into a new game** in its notice; that saves a new private game with the same players on this device and leaves the shared game as it is (REQ-0003-20).

## Accessibility

- A labelled modal dialog (see [ShareSheet](./ShareSheet.md): the shared `Dialog` keeps focus inside, closes with `Esc`, returns focus).
- Every row's buttons are named with the game ("Open Ana, Ben", "Leave Ana, Ben"). What you can do ("Can edit", "Watch only") and which game is open ("Open now") are words, never colour alone.
- **Games** and **Share** in the header are icon-only on a phone so the brand and both fit in 320 px; their names stay for screen readers.

## Testing

- `test/unit/app/components/games.test.tsx`, `test/unit/app/GamesControl.test.tsx`, `test/unit/lib/games-list.test.ts`
- `test/e2e/games.spec.ts`, `test/a11y/shared-game.spec.ts`, `test/visual/screens.spec.ts`
