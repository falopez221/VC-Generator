import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/app/", "/signin-with-chatgpt", "/signout-with-chatgpt", "/callback"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
