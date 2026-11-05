/** The one module that owns site metadata (docs/SEO_GUIDE.md). Framework-free plain objects. */

export const SITE = {
  name: "Chip Ledger",
  description:
    "Track buy-ins during the game, count chips at the end, and see exactly who pays whom.",
  locale: "en_US",
  /** Shown in the footer, in the order the owners chose. The same two holders as LICENSE. */
  copyrightHolders: "Jason Johnson and Vicente Opaso",
} as const;

/**
 * The page colors of each theme (`--color-bg` in styles/tokens.css), for the browser's theme color
 * and the installed app's splash screen. A unit test keeps them equal to the tokens.
 */
export const ROOM_COLORS = { light: "#f3f1ec", dark: "#0d0e10" } as const;

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
    // The large card shows the Open Graph image (app/opengraph-image.tsx) in link previews.
    twitter: {
      card: "summary_large_image" as const,
      title: SITE.name,
      description: SITE.description,
    },
  };
}

/** The browser bar follows the page color of the system theme (SPEC-0005 REQ-0005-17). */
export const THEME_COLORS = [
  { media: "(prefers-color-scheme: light)", color: ROOM_COLORS.light },
  { media: "(prefers-color-scheme: dark)", color: ROOM_COLORS.dark },
];

/**
 * The web app manifest, so the app can be installed with its own name, icons, and colors
 * (SPEC-0005 REQ-0005-16). It opens at the start page in its own window. Offline use is a
 * separate roadmap item (a service worker); this manifest does not promise it.
 */
export function webManifest() {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone" as const,
    background_color: ROOM_COLORS.dark,
    theme_color: ROOM_COLORS.dark,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" as const },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" as const },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable" as const,
      },
    ],
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
