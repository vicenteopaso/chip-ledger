# Forbidden Patterns

Anti-patterns and prohibited changes for human and AI contributors. Each has a stable ID (`FP-NN`) so reviews and PRs can cite it, a rationale, and the required alternative. Code samples are TypeScript/React; the principles apply to any stack.

Violations should be caught by lint and CI first, review second. This document is the "why" behind those rules.

## How to use

- Reviewing: cite the ID — "FP-04: this renders unsanitized HTML".
- Authoring: if you are about to do something listed here, stop and use the alternative.
- Exceptions need an in-line justification (see [AI Guardrails §5](./AI_GUARDRAILS.md)) and, for security items, an ADR.

---

## Security

### FP-01 Never bypass security controls

```typescript
// ❌ Skipping verification, commenting out rate limiting, "temporarily" removing checks
export async function POST(request: Request) {
  const data = await request.json();
  // const limited = await rateLimit(request);  // removed to fix 429s
  return handle(data); // no bot check, no validation
}
```

```typescript
// ✅ Full stack, in order: cheap rejections first, expensive work last
export async function POST(request: Request) {
  const limited = await checkRateLimit(getClientIp(request));
  if (!limited.ok) {
    return new Response("Too many requests", { status: 429, headers: { "Retry-After": "60" } });
  }
  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return new Response("Invalid request", { status: 400 });
  if (!(await verifyBotToken(parsed.data.token)))
    return new Response("Verification failed", { status: 400 });
  return handle(parsed.data);
}
```

A control that blocks a legitimate flow has a root cause (misconfiguration, wrong limit, bad test). Fix that.

### FP-02 Never hard-code secrets or leak them via public variables

```typescript
// ❌
const API_KEY = "<literal key pasted into source>";
export const NEXT_PUBLIC_SECRET = "should-not-be-public";
```

```typescript
// ✅ Server-only secret; only genuinely public values get the public prefix
const API_KEY = requireEnv("PAYMENTS_API_KEY");
export const publicSiteKey = process.env.NEXT_PUBLIC_SITE_KEY;
```

Client-exposed variables (`NEXT_PUBLIC_*` or equivalent) are public by definition.

### FP-03 Never skip input validation

```typescript
// ❌ Trusting the client, or "validating" with includes("@")
const data = await request.json();
await save(data.email, data.message);
```

```typescript
// ✅ Schema at the boundary, with limits
const Contact = z.object({
  email: z.string().email().max(254),
  message: z.string().min(10).max(5000),
});
const parsed = Contact.safeParse(await request.json());
if (!parsed.success) return new Response("Invalid request", { status: 400 });
```

### FP-04 Never render unsanitized HTML

```tsx
// ❌
<div dangerouslySetInnerHTML={{ __html: userContent }} />;
element.innerHTML = externalData;
```

```tsx
// ✅ Sanitize with an allow-list, or render through controlled components
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
<Markdown components={markdownComponents}>{content}</Markdown>
```

### FP-05 Never expose internal errors

```typescript
// ❌ Stack traces, hostnames, SQL, or env values in a response
catch (error) {
  return Response.json({ error: error.message, stack: error.stack });
}
```

```typescript
// ✅ Generic message to the user; detail to structured logs
catch (error) {
  logError(error, { context: "create-order", requestId });
  return new Response("Something went wrong. Please try again.", { status: 500 });
}
```

### FP-06 Never trust client-supplied identity or authorization

```typescript
// ❌ The client says who it is and what it may do
const { userId, isAdmin } = await request.json();
```

```typescript
// ✅ Derive identity and permissions from the verified session on the server
const session = await requireSession(request);
await assertCan(session.user, "orders:write");
```

### FP-07 Never put secrets or personal data in URLs or logs

Query strings land in logs, referrers, and analytics. Tokens go in headers or POST bodies. Redact secrets and personal data in log context.

---

## Accessibility

### FP-08 Never break keyboard navigation

```tsx
// ❌ A div pretending to be a button; outline removed
<div onClick={save} style={{ outline: "none" }}>
  Save
</div>
```

```tsx
// ✅ Native element, visible focus
<button type="button" onClick={save} className="focus-visible:outline focus-visible:outline-2">
  Save
</button>
```

Modals trap focus while open and restore it on close. Nothing may be reachable by mouse only.

### FP-09 Never misuse ARIA

The first rule of ARIA is to use a native element instead. Do not add `role="button"` to a `<button>`, `aria-label` that contradicts visible text, or `aria-hidden` on focusable content.

### FP-10 Never omit or fake alt text

```tsx
// ❌ <img src="/chart.png" />   <img src="/chart.png" alt="image" />
// ✅ Meaningful: describe the information. Decorative: empty alt.
<img src="/chart.png" alt="Signups grew 40% from January to March" />
<img src="/divider.svg" alt="" />
```

### FP-11 Never disable accessibility lint rules

Fix the markup. If a rule produces a false positive, narrow the exception to one line with a reason and an issue link.

### FP-12 Never remove skip links, the document title, or the viewport meta

Every page has a unique `<title>`, `lang` on `<html>`, a visible skip-to-content link, and `width=device-width, initial-scale=1`. Do not disable user zoom.

---

## Architecture

### FP-13 Never cross layer boundaries

```typescript
// ❌ UI importing an API route; API importing a component; fs in a component
import { POST } from "@/app/api/contact/route";
const file = fs.readFileSync("./content/about.md");
```

```typescript
// ✅ UI calls the API over HTTP; data comes from domain/infra helpers on the server
const content = await loadContent(lang); // lives in the domain layer
```

### FP-14 Never create shared mutable state

```typescript
// ❌ Module-level state is shared across requests and users
let currentUser: User | null = null;
let cached: Data | undefined;
```

```typescript
// ✅ Request-scoped data, or explicitly keyed caches with eviction
const user = await getUserFromRequest(request);
const cache = new Map<string, Data>(); // keyed, bounded
```

### FP-15 Never bypass centralized utilities

Use the project's single implementation for error logging, sanitization, validation helpers, SEO metadata, HTTP clients, and date/number formatting. Ad-hoc `console.error`, hand-rolled `replace(/<script>/g, "")`, or copy-pasted metadata objects are forbidden.

### FP-16 Never manipulate the DOM directly in React

```tsx
// ❌ document.getElementById("x").focus();
// ✅ useRef + effect; state for visibility; no raw document/window in render paths
const ref = useRef<HTMLInputElement>(null);
useEffect(() => ref.current?.focus(), []);
```

### FP-17 Never use `any` or unvalidated non-null assertions

Use `unknown` plus narrowing or a schema. `value!` hides a bug that will surface in production; validate instead. See the exception template in [AI Guardrails](./AI_GUARDRAILS.md).

### FP-18 Never use the HTML-level equivalent of a framework primitive

Internal navigation uses the framework `Link`; images use the framework `Image` (size, format, lazy loading). Raw `<a href="/internal">` and `<img>` forfeit prefetching, optimization, and layout stability.

---

## Performance

### FP-19 Never block the main thread or ship unoptimized assets

Heavy synchronous work belongs on the server or in a worker. Images need dimensions and modern formats; fonts need `display: swap` or equivalent.

### FP-20 Never import whole libraries for one function

```typescript
// ❌ import _ from "lodash";           import fs from "fs"; // in a client component
// ✅ import uniq from "lodash/uniq";   // granular, tree-shakeable; server-only code stays server-side
```

Do not add a dependency for something the platform or an existing dependency already does.

---

## Testing

### FP-21 Never write tests just for coverage

```typescript
// ❌ expect(wrapper).toBeTruthy(); — asserts nothing
// ❌ expect(component.state.count).toBe(0); — tests internals
```

```typescript
// ✅ Observable behavior, queried the way a user finds things
await userEvent.click(screen.getByRole("button", { name: /increment/i }));
expect(screen.getByText("Count: 1")).toBeInTheDocument();
```

### FP-22 Never disable tests instead of fixing them

`test.skip`, `it.todo` as a hiding place, commented-out tests, or loosened assertions to go green. Fix the code or the test, or defer explicitly with a tracking issue linked in a comment.

### FP-23 Never use fixed sleeps in tests

```typescript
// ❌ await page.waitForTimeout(2000);
// ✅ Wait for the condition a user would perceive
await expect(page.getByRole("status")).toHaveText("Saved");
```

### FP-24 Never snapshot dynamic content unmasked

Timestamps, random IDs, ads, live data, and animations make visual and snapshot tests flaky. Mask them, freeze the clock, seed randomness, and disable animations.

---

## Process

### FP-25 Never let documentation drift

A README that says `npm start` for a pnpm project, a comment describing a removed behavior, or a spec that contradicts the code are defects (CONSTITUTION-16). Update docs in the same PR.

### FP-26 Never bypass hooks or gates

`git commit --no-verify`, force-pushing to protected branches, disabling a CI job, lowering a coverage threshold, or editing branch protection to merge a PR (CONSTITUTION-14).

### FP-27 Never commit secrets, local env files, or build artifacts

`.env*` (other than `.env.example`), keys, certificates, `node_modules`, coverage, and framework build output stay out of git. If a secret is committed: rotate first, then clean history.

### FP-28 Never mix unrelated changes into one PR

Feature, refactor, dependency bump, and formatting sweep are separate PRs. Mixed PRs are unreviewable and unrevertable.

### FP-29 Never present placeholder or partial work as finished

Lorem ipsum, stub implementations, brand-only mock-ups, or an unverified fix described as done. Label WIP honestly and name what is missing.

---

## Enforcement

| Layer       | Mechanism                                                       |
| ----------- | --------------------------------------------------------------- |
| Editor/lint | ESLint (security, a11y, boundaries, type safety), Prettier      |
| Types       | TypeScript strict; schemas at every boundary                    |
| Hooks       | Pre-commit secret scan and lint-staged                          |
| CI          | Tests, coverage, a11y, CodeQL, dependency audit, PR checks      |
| Review      | [Review Checklist](./REVIEW_CHECKLIST.md) and cited `FP-NN` IDs |

## Adding a pattern

1. Add it here with the next free ID, the reason, a ❌ example, and a ✅ alternative.
2. Add a lint rule or CI check if it can be automated.
3. Add a line to the [Review Checklist](./REVIEW_CHECKLIST.md) if it cannot.
4. If it is an invariant, propose a Constitution amendment.

IDs are never reused. Retire a pattern by marking it `[RETIRED]`.
