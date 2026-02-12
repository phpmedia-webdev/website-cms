import type { MetadataRoute } from "next";

/**
 * robots.txt: allow crawlers on the site but disallow the RAG knowledge endpoint.
 * The RAG URL is for the external AI bot only; we don't want it indexed or crawled.
 * Monitor site analytics for /api/rag traffic if abuse is a concern.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/rag/",
    },
  };
}
