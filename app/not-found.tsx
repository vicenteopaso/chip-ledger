import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-app px-4 pt-3.5">
      <h1 className="mt-2.5 mb-1.5 text-5xl leading-display font-extrabold tracking-display">
        Page not found
      </h1>
      <p className="mb-6 text-text-muted">
        <Link href="/" className="font-semibold text-accent underline">
          Go to Chip Ledger
        </Link>
      </p>
    </main>
  );
}
