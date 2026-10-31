# Accessibility

Accessibility is a release requirement, not a polish step. WCAG 2.1 AA is the floor (CONSTITUTION-12). Do not regress it to hit a visual or performance goal — fix both.

## 1. Principles (POUR)

- **Perceivable** — content is available to every sense a user has: text alternatives, captions, sufficient contrast, no information by color alone.
- **Operable** — everything works by keyboard, with enough time, no seizure triggers, and clear navigation.
- **Understandable** — readable language, predictable behavior, helpful error messages.
- **Robust** — valid, semantic markup that assistive technology can interpret.

## 2. Requirements

### Structure and semantics

- One `<h1>` per page; heading levels never skip.
- Landmarks: `header`, `nav`, `main`, `footer` (and `aside` where relevant), each unique or labelled.
- Real lists, tables, and buttons. Links navigate; buttons act.
- `<html lang>` set (and updated for localized pages); unique, descriptive `<title>`.
- A visible **skip to content** link is the first focusable element.

### Keyboard and focus

- Every interactive element is reachable and operable by keyboard; tab order follows reading order.
- Focus is always visible (3:1 contrast against its surroundings) and never removed without a replacement.
- Dialogs and menus move focus in, trap it while open, close on `Esc`, and return focus to the trigger.
- No keyboard traps; no pointer-only gestures without an alternative.

### Color and contrast

- Body text ≥ 4.5:1; large text (≥ 24 px, or ≥ 19 px bold) and UI components/graphics ≥ 3:1.
- Meet these in **every theme** (light, dark, any high-contrast variant), including states: hover, focus, disabled-looking-but-readable, error.
- Never use color alone to convey meaning.

#### Conforming alternate pattern

If a brand color cannot meet contrast in one theme, WCAG allows a **conforming alternate version** (technique G174): a clearly available toggle that gives a fully accessible rendering of the same content. If you rely on this, record it in an ADR, make the toggle available on every page and reachable early in the tab order, persist the choice, and gate the automated contrast check on the alternate rather than disabling it.

### Images and media

- Meaningful images have concise `alt` text that conveys the information; decorative images use `alt=""`.
- Complex graphics get a longer text description nearby.
- Video has captions; audio has transcripts; nothing autoplays with sound.

### Forms

- Every control has a programmatic label (visible `<label>`). Placeholders are not labels.
- Required fields and formats are stated up front.
- Errors are specific, associated with the field (`aria-describedby`), announced (`role="alert"` or live region), and focus moves to the first error.
- Don't clear user input on failure.

### Motion and timing

- Respect `prefers-reduced-motion`; no flashing above 3 per second.
- No unexpected time limits; allow extend or disable.

### ARIA

- Prefer native HTML. Use ARIA only when no native element exists, and follow the authoring practices for the pattern.
- No redundant roles, no `aria-hidden` on focusable content, and `aria-label` must include the visible text.

### Shared games (SPEC-0003)

- A watcher is told in words what they can do; read-only fields are focusable and announced as read-only, not disabled, so keyboard and screen-reader users can still read them ([ReadOnly](./components/ReadOnly.md)).
- Connection changes ("Reconnecting.", "You're offline…", "Live again.") and "The game has started." go through the page's one polite live region, in words.
- The page for a game that cannot be opened is the same for every cause and has a title, a way on, and no color-only meaning.

### Share sheet and edit codes (SPEC-0003)

- The Share sheet is a labelled modal dialog: focus moves in, Tab stays inside (a radio group is one stop), `Esc` closes it and focus returns to **Share**. The QR code's text alternative points to the link written out below and to **Copy link**; the link and the edit code are text, and the code's name spells it letter by letter ([ShareSheet](./components/ShareSheet.md)).
- The edit-code form for watchers has a visible label, one message for every failed code, and stays typeable on a read-only page ([EditCodeForm](./components/EditCodeForm.md)).

### Chip sales (SPEC-0004)

- The "Sell chips" form has visible labels, moves focus to its first field on open and back to its button on close, closes with `Esc`, and explains a refusal in text ([SellChips](./components/SellChips.md)).
- Amounts and the "incl. +5.00 from chip sales" lines are text, never color alone; a sale is announced in the live region, on the device that made it and on the others.

## 3. Implementation

- Shared components bake in accessibility (labels, focus management) so feature code inherits it.
- Document keyboard interaction and ARIA usage in each component's doc ([template](./components/_TEMPLATE.md)).
- Design tokens define accessible color pairs; pick from them rather than inventing colors.

## 4. Testing

| Layer      | What                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Lint       | `eslint-plugin-jsx-a11y`; no disabled a11y rules ([FP-11](./FORBIDDEN_PATTERNS.md))                            |
| Component  | Query by role/name; assert focus behavior and live-region text                                                 |
| Automated  | axe on key pages and states in every theme (`pnpm test:a11y`)                                                  |
| Lighthouse | Accessibility score budget in `sdd.yaml`                                                                       |
| Manual     | Keyboard-only walkthrough; screen reader (VoiceOver, NVDA) for new patterns; zoom to 200% and reflow at 320 px |

Automated tools find only a portion of issues. A manual pass is part of review for any new interaction.

## 5. Tools

axe DevTools, Lighthouse, WAVE, Accessibility Insights, the browser's accessibility tree, contrast checkers, VoiceOver / NVDA / JAWS.

## 6. Accessibility statement _(web profile)_

Publish a statement with your conformance target, known limitations, a contact method, and the date last reviewed. Keep it truthful: list real gaps and the plan to close them.

## Related

[Engineering Standards §5](./ENGINEERING_STANDARDS.md) · [Review Checklist §3](./REVIEW_CHECKLIST.md) · [Design System](./DESIGN_SYSTEM.md) · [Testing §7](./TESTING.md)
