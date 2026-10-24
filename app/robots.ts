import type { MetadataRoute } from "next";

import { robotsRules } from "@/lib/seo";
import { getSiteUrl } from "@/lib/infra/env";

export default function robots(): MetadataRoute.Robots {
  return robotsRules(getSiteUrl());
}
