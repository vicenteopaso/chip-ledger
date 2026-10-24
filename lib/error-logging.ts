/**
 * The single place application code reports errors (docs/ERROR_HANDLING.md, CONSTITUTION-11).
 * Writes structured JSON to the console; there is no error tracker configured yet.
 */

export type LogContext = {
  /** Component or action, for example "photo-count". */
  context: string;
  requestId?: string;
  /** Metadata. Never secrets or personal data; known-sensitive keys are redacted anyway. */
  [key: string]: unknown;
};

const SENSITIVE_KEY = /key|token|secret|password|authorization|cookie/i;

function redact(ctx: LogContext): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(ctx).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? "[redacted]" : value,
    ]),
  );
}

function describe(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function logError(error: unknown, ctx: LogContext): void {
  console.error(JSON.stringify({ level: "error", ...redact(ctx), error: describe(error) }));
}

export function logWarning(message: string, ctx: LogContext): void {
  console.warn(JSON.stringify({ level: "warn", message, ...redact(ctx) }));
}
