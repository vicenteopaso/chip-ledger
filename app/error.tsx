"use client";

import { useEffect } from "react";

import { Button } from "@/app/components/Button";
import { PageTitle } from "@/app/components/Typography";
import { logError } from "@/lib/error-logging";

/** Route-level error boundary: generic message, retry, detail to the logger only. */
export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    logError(error, { context: "app/error" });
  }, [error]);

  return (
    <main id="main" className="mx-auto max-w-app px-4 pt-3.5">
      <PageTitle>Something went wrong</PageTitle>
      <p className="mb-6 text-text-muted">Your game is saved on this device. Try again.</p>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
