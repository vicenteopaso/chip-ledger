import type { MetadataRoute } from "next";

import { webManifest } from "@/lib/seo";

/** Served at /manifest.webmanifest and linked from every page (SPEC-0005 REQ-0005-16). */
export default function manifest(): MetadataRoute.Manifest {
  return webManifest();
}
