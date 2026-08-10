import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas and auth routes: nothing to index, and crawling them
      // only burns budget on pages that redirect to a login screen.
      disallow: ["/admin", "/espace", "/auth/", "/connexion", "/inscription"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
