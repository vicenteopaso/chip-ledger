# API Patterns

Conventions for HTTP route handlers (and server actions). The goal: every endpoint looks the same, so it is easy to review and hard to get wrong.

## 1. Handler structure

Order matters: reject cheap and unauthenticated traffic first, do expensive work last.

1. Correlate (`requestId`)
2. Origin / method checks
3. Rate limit
4. Authenticate and authorize
5. Parse and validate input (schema)
6. Execute the use case (domain layer)
7. Map the result to a response
8. On any thrown error: log with context, return a generic response

```typescript
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const limited = await checkRateLimit(getClientIp(request));
    if (!limited.ok)
      return problem(429, "rate_limited", "Too many requests.", requestId, { "Retry-After": "60" });

    const session = await requireSession(request); // 401 if absent
    await assertCan(session.user, "things:create"); // 403 if not allowed

    const parsed = CreateThing.safeParse(await request.json());
    if (!parsed.success)
      return problem(400, "invalid_request", "The request was not valid.", requestId);

    const thing = await createThing(parsed.data, session.user);
    return Response.json(thing, { status: 201, headers: { Location: `/api/things/${thing.id}` } });
  } catch (error) {
    logError(error, { context: "POST /api/things", requestId });
    return problem(500, "internal_error", "Something went wrong. Please try again.", requestId);
  }
}
```

Route handlers contain no business rules. They validate, authorize, delegate, and shape the response.

## 2. Input validation

- Define one schema per endpoint; infer the TypeScript type from it.
- Constrain everything: types, lengths, ranges, enums. Reject unknown keys for strict contracts.
- Validate path and query parameters as well as bodies.
- Share the schema with the client form so both enforce the same rules.

## 3. Error responses

One shape for every error (modeled on RFC 9457 problem details):

```json
{
  "type": "invalid_request",
  "title": "The request was not valid.",
  "status": 400,
  "requestId": "6f1c…",
  "errors": [{ "field": "email", "message": "Enter a valid email" }]
}
```

| Status | Use for                                                                                       |
| ------ | --------------------------------------------------------------------------------------------- |
| 400    | Malformed or invalid input                                                                    |
| 401    | Not authenticated                                                                             |
| 403    | Authenticated but not permitted                                                               |
| 404    | Not found (also for resources the caller must not know exist)                                 |
| 409    | Conflict with current state                                                                   |
| 422    | Well-formed but semantically unacceptable (optional; pick one of 400/422 and stay consistent) |
| 429    | Rate limited, with `Retry-After`                                                              |
| 500    | Unexpected error (generic body, detail in logs)                                               |

`errors[].message` is user-safe text. Never include stack traces, SQL, internal IDs, or hostnames.

## 4. Rate limiting and abuse protection

- Every public endpoint is rate limited. Choose limits per route sensitivity (auth and contact forms stricter than reads).
- Key by authenticated user where possible, otherwise by IP (respecting the trusted proxy header).
- Add bot protection on unauthenticated write endpoints; verify the token server-side.
- Include a honeypot field on public forms; respond as if successful so bots learn nothing.
- Return `429` with `Retry-After`. Log aggregates, not every hit.

## 5. Idempotency and retries

- `GET`, `PUT`, `DELETE` are idempotent by design. For `POST` that creates resources, accept an `Idempotency-Key` header and store the result.
- Clients retry only idempotent calls, with exponential backoff and jitter.
- Set timeouts on every outbound call; fail fast and degrade gracefully.

## 6. Security checklist

- [ ] Authentication and authorization derived server-side
- [ ] Input validated with a schema; limits enforced
- [ ] Rate limiting present; bot protection on public writes
- [ ] Origin/CORS locked to known origins; no wildcard with credentials
- [ ] Responses contain no secrets, internal errors, or more data than needed (return explicit fields, not raw records)
- [ ] State-changing requests protected against CSRF
- [ ] Errors logged with `requestId`; users see generic messages
- [ ] New env vars documented in [Configuration](./CONFIGURATION.md)

## 7. Versioning and compatibility

- Additive changes are safe: new optional fields, new endpoints.
- Breaking changes (removed/renamed fields, changed semantics) need a spec, a migration path, and an ADR for public APIs. Version in the path (`/api/v2/…`) or via a header, and keep the old version through a deprecation window.
- Document the contract (OpenAPI or the Zod schemas) next to the code.

## 8. Testing

Test each handler for: success; each validation failure; unauthenticated; forbidden; rate-limited; upstream failure (generic 500 and one logged error); and idempotent replay. Mock infra at the adapter boundary, not inside the handler.

## Related

[Error Handling](./ERROR_HANDLING.md) · [Security Policy](./SECURITY_POLICY.md) · [Forbidden Patterns](./FORBIDDEN_PATTERNS.md) · [Testing](./TESTING.md)
