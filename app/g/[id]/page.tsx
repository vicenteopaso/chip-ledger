import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { SharedGameApp } from "@/app/SharedGameApp";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SITE } from "@/lib/seo";
import { GameIdSchema } from "@/lib/shared-game";

/**
 * A shared game's page (SPEC-0003). Its link carries a secret, so the page is never indexed and
 * sends no referrer; the secret itself is in the part of the address after `#`, which the server
 * never sees.
 */
export const metadata: Metadata = {
  title: SITE.name,
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  alternates: { canonical: null },
};

export default async function SharedGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!GameIdSchema.safeParse(id).success) notFound();
  // Rendered per request so the CSP nonce from proxy.ts can be applied (ADR-0004).
  await connection();
  return (
    <SharedGameApp
      id={id}
      footer={<SiteFooter year={new Date().getFullYear()} holders={SITE.copyrightHolders} />}
    />
  );
}
