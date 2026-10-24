import "@/app/globals.css";

import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";

import { pageMetadata } from "@/lib/seo";
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
    <html lang="en" className={bricolage.variable}>
      <body>
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
