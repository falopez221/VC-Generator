import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/config/site";
import { APPLICATION_CATALOG } from "@/src/applications/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/applications`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/lab`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/lab/demo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/lab/valuation`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.75 },
    { url: `${SITE_URL}/lab/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/request-access`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...APPLICATION_CATALOG.map((application) => ({ url: `${SITE_URL}/applications/${application.slug}`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: application.featured ? 0.75 : 0.55 })),
  ];
}
