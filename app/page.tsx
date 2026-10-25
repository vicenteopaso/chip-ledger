import { connection } from "next/server";

import { ChipLedgerApp } from "@/app/ChipLedgerApp";
import { SiteFooter } from "@/app/components/SiteFooter";
import { getPhotoCountConfig } from "@/lib/infra/env";
import { SITE } from "@/lib/seo";

export default async function Home() {
  // Rendered per request so the CSP nonce from proxy.ts can be applied (ADR-0004). It also
  // keeps the footer year current instead of fixed at build time.
  await connection();
  const { enabled } = getPhotoCountConfig();
  return (
    <>
      <main id="main" className="mx-auto max-w-app px-4 pt-3.5 pb-6">
        <ChipLedgerApp photoCountingEnabled={enabled} />
      </main>
      <SiteFooter year={new Date().getFullYear()} holders={SITE.copyrightHolders} />
    </>
  );
}
