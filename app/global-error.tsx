"use client";

import "@/app/globals.css";

import { useEffect } from "react";

import { logError } from "@/lib/error-logging";

/** Last-resort boundary for errors in the root layout. Renders its own document. */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logError(error, { context: "app/global-error" });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-app px-4 pt-3.5">
          <h1 className="mt-2.5 mb-1.5 text-5xl font-extrabold">Something went wrong</h1>
          <p className="mb-6 text-text-muted">Try again in a moment.</p>
          <button
            type="button"
            className="rounded-xl border-control border-border bg-surface px-4.5 py-4 font-semibold"
            onClick={reset}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
