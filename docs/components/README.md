# Component Documentation

Every reusable component has a short doc here, written from [`_TEMPLATE.md`](./_TEMPLATE.md). The doc is the contract: purpose, API, accessibility behavior, tokens, and tests. Update it in the same PR that changes the component (CONSTITUTION-16).

## When a doc is required

- Components used in more than one place
- Anything with non-trivial keyboard or ARIA behavior (dialogs, menus, carousels, comboboxes)
- Providers and error boundaries

One-off page-private components do not need a doc.

## Index

| Component       | Purpose                                                   | Doc                                 |
| --------------- | --------------------------------------------------------- | ----------------------------------- |
| `Button`        | Native button with primary/secondary/danger/link variants | [Button](./Button.md)               |
| `ConfirmInline` | Destructive action confirmed in place                     | [ConfirmInline](./ConfirmInline.md) |
| `Chip`          | Decorative chip artwork per color                         | [Chip](./Chip.md)                   |
| `DraftInput`    | Text input bound to a parsed value                        | [DraftInput](./DraftInput.md)       |
| `LiveAnnouncer` | The page's single polite live region                      | [LiveAnnouncer](./LiveAnnouncer.md) |
| `StepsNav`      | Four-step navigation                                      | [StepsNav](./StepsNav.md)           |

Screens (`SetupScreen`, `TableScreen`, `CashOutScreen`, `SettleScreen`) and their one-off parts are page-private and documented by [SPEC-0001](../specs/0001-chip-ledger/spec.md).

## Quality bar for a doc

- Props table with types, defaults, and required flags
- A minimal example and one realistic example
- Keyboard interaction and screen-reader behavior stated explicitly
- Tokens used (no raw values)
- What is tested and where

See also: [Design System](../DESIGN_SYSTEM.md) · [Accessibility](../ACCESSIBILITY.md)
