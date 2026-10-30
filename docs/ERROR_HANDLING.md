# Error Handling

How errors are detected, contained, logged, and shown. Implements CONSTITUTION-11: no silent failures, generic messages for users, detail for operators.

## 1. Philosophy

1. **Fail loudly in logs, gracefully in the UI.** Every error is recorded with context; users see a calm, actionable message.
2. **Handle errors where you can act on them.** Catch at a boundary that knows what to do; otherwise let it propagate.
3. **Make illegal states unrepresentable.** Schemas and exhaustive types beat defensive `if`s.
4. **Never leak.** No stack traces, file paths, SQL, hostnames, or environment values in responses.
5. **An ignored error needs a comment** saying why ignoring is safe.

## 2. The logging helper

All application errors go through one module (default `lib/error-logging.ts`). Do not call `console.error` directly in application code.

```typescript
// lib/error-logging.ts (contract)
export type LogContext = {
  context: string; // component or action, e.g. "create-order"
  requestId?: string;
  [key: string]: unknown; // metadata; never secrets or personal data
};

export function logError(error: unknown, ctx: LogContext): void;
export function logWarning(message: string, ctx: LogContext): void;
```

Responsibilities: normalize `unknown` errors, attach context, redact known-sensitive keys, forward to the error tracker in production, and print structured output in development.

## 3. Client-side

### Error boundaries

Wrap route segments and risky widgets so one failure does not blank the page. A boundary renders a fallback with a retry action, logs via the helper, and never shows `error.message` to the user.

```tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    logError(error, { context: "ErrorBoundary", componentStack: info.componentStack });
  }
  render() {
    return this.state.hasError ? (
      <Fallback onRetry={() => this.setState({ hasError: false })} />
    ) : (
      this.props.children
    );
  }
}
```

Framework-level error files (for example `error.tsx` and a global error page) cover errors outside React render. Add global `error` and `unhandledrejection` listeners that report through the helper.

### Forms and user input

- Validate with the same schema the server uses; show field-level messages.
- Associate errors with inputs (`aria-describedby`) and announce them (`role="alert"` or a live region). Move focus to the first invalid field on submit.
- On network failure, preserve what the user typed and offer retry.

### Loading and fetch failures

Handle three states explicitly: loading, success, failure. Failure UI says what happened in plain language and what the user can do next.

## 4. Server-side

### API routes

Shared-game routes (`/api/games`) add two cases: a store failure, such as the free plan's monthly quota, answers a generic `503 unavailable` with `Retry-After` and the client keeps the local game running; and every "game not found" case (unknown id, deleted, bad key) answers the same `404`. See [SPEC-0003](./specs/0003-shared-live-games/spec.md).

```typescript
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const parsed = Schema.safeParse(await request.json());
    if (!parsed.success) {
      return problem(400, "invalid_request", "The request was not valid.", requestId);
    }
    const result = await execute(parsed.data);
    return Response.json(result, { status: 201 });
  } catch (error) {
    logError(error, { context: "POST /api/things", requestId });
    return problem(500, "internal_error", "Something went wrong. Please try again.", requestId);
  }
}
```

- Return the same error shape everywhere (see [API Patterns](./API_PATTERNS.md)).
- Include a `requestId` in the response so support can find the log line.
- Map known domain errors to specific statuses (400, 401, 403, 404, 409, 429). Everything else is 500.
- Do not retry non-idempotent operations automatically.

### Rendering errors (SSR/SSG)

Data-loading failures at render time should throw to the nearest error boundary or call the framework's `notFound()`. Never render a half-empty page silently.

### Environment validation

Validate configuration once at startup with a schema and fail fast with a clear message about **which** variable is missing — never print its value.

```typescript
const Env = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
});
export const env = Env.parse(process.env);
```

## 5. Preventing silent failures

Lint rules that help: `no-empty` (catch blocks), `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `@typescript-eslint/switch-exhaustiveness-check`.

```typescript
// ❌
try {
  await sync();
} catch {}

// ✅ handle, or log and continue deliberately
try {
  await sync();
} catch (error) {
  logWarning("sync failed; continuing with cached data", { context: "sync", error });
}
```

## 6. Message guidelines

| Do                                          | Don't                                    |
| ------------------------------------------- | ---------------------------------------- |
| "We couldn't save your changes. Try again." | "Error 0x80004005" / raw `error.message` |
| Say what happened and what to do next       | Blame the user                           |
| Keep messages localized and consistent      | Mix tones or languages                   |
| Offer a retry or alternative path           | Dead-end the user                        |

## 7. Monitoring and debugging

| Question                           | Where to look                                               |
| ---------------------------------- | ----------------------------------------------------------- |
| What failed for this request?      | Server logs by `requestId`                                  |
| Is this new since the last deploy? | Error tracker, filtered by release                          |
| How many users are affected?       | Error tracker issue count and affected sessions             |
| Is it getting slower?              | Web Vitals / tracing in [Observability](./OBSERVABILITY.md) |

Debugging workflow: reproduce → read the log with context → find the first failing boundary → write a failing test → fix → confirm the error rate drops after deploy.

## 8. Testing error states

- Unit: schema rejects bad input; helpers throw typed errors.
- Route: each error path returns the right status and the generic body; the logger is called once with context.
- Component: boundary renders the fallback; form shows announced field errors.
- E2E: simulate an upstream failure and assert the user-visible message and recovery.

## Related

[API Patterns](./API_PATTERNS.md) · [Observability](./OBSERVABILITY.md) · [AI Guardrails §6–7](./AI_GUARDRAILS.md) · [Forbidden Patterns](./FORBIDDEN_PATTERNS.md)
