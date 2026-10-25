import "@/app/globals.css";

import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { getSiteUrl } from "@/lib/infra/env";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-bricolage",
});

export const metadata: Metadata = pageMetadata({ siteUrl: getSiteUrl(), path: "/" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // data-theme is set by the pre-paint script, so React must not flag it as a mismatch.
    <html lang="en" className={bricolage.variable} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <a
          href="#main"
          className="sr-only rounded-md bg-surface px-4 py-3 font-semibold text-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-10"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
