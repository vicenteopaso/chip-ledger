# Component Documentation

Every reusable component has a short doc here, written from [`_TEMPLATE.md`](./_TEMPLATE.md). The doc is the contract: purpose, API, accessibility behavior, tokens, and tests. Update it in the same PR that changes the component (CONSTITUTION-16).

## When a doc is required

- Components used in more than one place
- Anything with non-trivial keyboard or ARIA behavior (dialogs, menus, carousels, comboboxes)
- Providers and error boundaries

One-off page-private components do not need a doc.

## Index

| Component | Purpose | Doc |
| --------- | ------- | --- |
|           |         |     |

_No components documented yet._

## Quality bar for a doc

- Props table with types, defaults, and required flags
- A minimal example and one realistic example
- Keyboard interaction and screen-reader behavior stated explicitly
- Tokens used (no raw values)
- What is tested and where

See also: [Design System](../DESIGN_SYSTEM.md) · [Accessibility](../ACCESSIBILITY.md)
