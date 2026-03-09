/**
 * GET /blog/feed.xml — RSS 2.0 feed for published blog posts.
 * Used for syndication and discovery; readers deduplicate by guid.
 */

import { getPublishedPosts } from "@/lib/supabase/content";
import { getSiteMetadata } from "@/lib/supabase/settings";

const RSS_LIMIT = 30;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRssDate(isoDate: string | null): string {
  if (!isoDate) return new Date().toUTCString();
  try {
    return new Date(isoDate).toUTCString();
  } catch {
    return new Date().toUTCString();
  }
}

export async function GET() {
  const [posts, meta] = await Promise.all([
    getPublishedPosts(RSS_LIMIT, 0),
    getSiteMetadata(),
  ]);

  const baseUrl = (meta.url?.trim() ?? "").replace(/\/$/, "") || "";
  const title = escapeXml(meta.name?.trim() || "Blog");
  const description = escapeXml(meta.description?.trim() || "Latest blog posts.");
  const lastBuildDate = formatRssDate(
    posts.length > 0 ? posts[0].published_at ?? posts[0].updated_at : null
  );

  const items = posts
    .map((post) => {
      const link = baseUrl ? `${baseUrl}/blog/${encodeURIComponent(post.slug)}` : "";
      const guid = baseUrl ? `${baseUrl}/blog/${encodeURIComponent(post.slug)}` : post.id;
      const itemTitle = escapeXml(post.title || "Untitled");
      const itemDesc = escapeXml((post.excerpt || "").trim() || "No excerpt.");
      const pubDate = formatRssDate(post.published_at);

      return `<item>
  <title>${itemTitle}</title>
  <link>${escapeXml(link)}</link>
  <guid isPermaLink="true">${escapeXml(guid)}</guid>
  <description>${itemDesc}</description>
  <pubDate>${pubDate}</pubDate>
</item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${title}</title>
    <link>${escapeXml(baseUrl ? `${baseUrl}/blog` : "")}</link>
    <description>${description}</description>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${escapeXml(baseUrl ? `${baseUrl}/blog/feed.xml` : "")}" rel="self" type="application/rss+xml" />
${items ? `\n${items}\n` : ""}  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
