import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/lab`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/lab/demo`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/lab/methodology`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
