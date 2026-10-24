import { connection } from "next/server";

import { ChipLedgerApp } from "@/app/ChipLedgerApp";
import { getPhotoCountConfig } from "@/lib/infra/env";

export default async function Home() {
  // Rendered per request so the CSP nonce from proxy.ts can be applied (ADR-0004).
  await connection();
  const { enabled } = getPhotoCountConfig();
  return (
    <main id="main" className="mx-auto max-w-app px-4 pt-3.5 pb-33">
      <ChipLedgerApp photoCountingEnabled={enabled} />
    </main>
  );
}
