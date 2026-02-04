/**
 * Coming Soon / Standby Mode Page
 *
 * Route: /coming-soon (file: src/app/(public)/coming-soon/page.tsx).
 * When a snippet is chosen in Settings → Site Mode (or Superadmin → Tenant → Site Mode),
 * that snippet is rendered here with formatting, links, images, and galleries—centered and
 * mobile responsive. Otherwise falls back to headline/message from settings.
 *
 * Design system (fonts, colors) from root layout applies. Admin and /admin/login remain accessible.
 */

import Link from "next/link";
import { getComingSoonCopy } from "@/lib/supabase/settings";
import { getClientSchema } from "@/lib/supabase/schema";
import { getTenantSiteBySchema } from "@/lib/supabase/tenant-sites";
import { getContentByIdServer } from "@/lib/supabase/content";
import { ComingSoonSnippetView } from "@/components/public/ComingSoonSnippetView";
import { Metadata } from "next";

/** Never cache so site mode toggle takes effect immediately. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { headline, siteName } = await getComingSoonCopy();
  return {
    title: `${headline} - ${siteName}`,
    description: "This site is currently in standby mode. Check back soon.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ComingSoonPage() {
  let snippetContent: Record<string, unknown> | null = null;
  try {
    const schema = getClientSchema();
    const site = await getTenantSiteBySchema(schema);
    if (site?.coming_soon_snippet_id) {
      const row = await getContentByIdServer(site.coming_soon_snippet_id, schema);
      if (row?.body) snippetContent = row.body;
    }
  } catch {
    // No schema or tenant; use fallback copy
  }

  const { headline, message, siteName } = await getComingSoonCopy();

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center"
      style={{
        backgroundColor: "var(--color-04)",
        color: "var(--color-06)",
        fontFamily: "var(--font-primary)",
      }}
    >
      <Link
        href="/admin"
        className="absolute right-4 top-4 text-xs underline opacity-70 hover:opacity-100"
        style={{ color: "var(--color-07)" }}
      >
        Admin
      </Link>
      {snippetContent ? (
        <ComingSoonSnippetView content={snippetContent} />
      ) : (
        <div className="container mx-auto px-4 text-center">
          <h1
            className="mb-4 text-4xl font-bold md:text-6xl"
            style={{
              fontFamily: "var(--font-primary)",
              color: "var(--color-06)",
            }}
          >
            {headline}
          </h1>
          <p
            className="mb-8 text-xl md:text-2xl"
            style={{
              fontFamily: "var(--font-secondary)",
              color: "var(--color-07)",
            }}
          >
            {message}
          </p>
          <p
            className="text-sm"
            style={{ color: "var(--color-07)" }}
          >
            {siteName}
          </p>
        </div>
      )}
    </div>
  );
}
