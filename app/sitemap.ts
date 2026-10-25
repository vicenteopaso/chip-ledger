import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/seo";
import { getSiteUrl } from "@/lib/infra/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(getSiteUrl());
}
