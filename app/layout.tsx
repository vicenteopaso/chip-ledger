import "@/app/globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { pageMetadata, THEME_COLORS } from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getSiteUrl } from "@/lib/infra/env";

// Self-hosted at build time, so the CSP keeps font-src 'self' (REQ-0005-02).
const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-geist" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = pageMetadata({ siteUrl: getSiteUrl(), path: "/" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLORS,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // The per-request nonce from proxy.ts; the inline theme script needs it to run under the CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // data-theme is set by the pre-paint script, so React must not flag it as a mismatch.
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>
        {/*
          Runs before the first paint so a forced theme does not flash. The content is a constant
          from our own code (lib/theme.ts), never user or external input, so it is safe as raw
          script text (FP-04). Browsers hide the nonce attribute from the DOM, so React would
          report it as a hydration mismatch; suppressHydrationWarning covers this element only.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <a
          href="#main"
          className="sr-only rounded-md bg-surface px-4 py-3 font-semibold text-accent-text focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-10"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
