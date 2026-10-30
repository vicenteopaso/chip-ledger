/** The one module that owns site metadata (docs/SEO_GUIDE.md). Framework-free plain objects. */

export const SITE = {
  name: "Chip Ledger",
  description:
    "Track buy-ins during the game, count chips at the end, and see exactly who pays whom.",
  locale: "en_US",
  /** Shown in the footer, in the order the owners chose. The same two holders as LICENSE. */
  copyrightHolders: "Jason Johnson and Vicente Opaso",
} as const;

/** Every path that should be indexed; the sitemap is generated from this list. */
export const INDEXABLE_PATHS = ["/"] as const;

export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}

export function pageMetadata({ siteUrl, path }: { siteUrl: string; path: string }) {
  const url = absoluteUrl(siteUrl, path);
  return {
    metadataBase: new URL(siteUrl),
    title: SITE.name,
    description: SITE.description,
    applicationName: SITE.name,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    appleWebApp: { capable: true, title: SITE.name },
    openGraph: {
      type: "website" as const,
      url,
      siteName: SITE.name,
      title: SITE.name,
      description: SITE.description,
      locale: SITE.locale,
    },
    twitter: { card: "summary" as const, title: SITE.name, description: SITE.description },
  };
}

export function sitemapEntries(siteUrl: string) {
  return INDEXABLE_PATHS.map((path) => ({ url: absoluteUrl(siteUrl, path) }));
}

export function robotsRules(siteUrl: string) {
  return {
    // Shared games carry a secret in their link: never crawled, never listed (SPEC-0003).
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/g/"] }],
    sitemap: absoluteUrl(siteUrl, "/sitemap.xml"),
  };
}
