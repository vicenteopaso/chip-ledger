import type { Metadata } from "next";
import Link from "next/link";

import { PageTitle } from "@/app/components/Typography";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-app px-4 pt-3.5">
      <PageTitle>Page not found</PageTitle>
      <p className="mb-6 text-text-muted">
        <Link href="/" className="font-semibold text-accent underline">
          Go to Chip Ledger
        </Link>
      </p>
    </main>
  );
}
