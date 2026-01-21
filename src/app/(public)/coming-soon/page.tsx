/**
 * Coming Soon / Standby Mode Page
 * This page is displayed when the site is in "coming soon" mode
 * Controlled by NEXT_PUBLIC_SITE_MODE environment variable
 */

import { getSiteMetadata } from "@/lib/supabase/settings";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const siteMetadata = await getSiteMetadata();
  
  return {
    title: `Coming Soon - ${siteMetadata.name}`,
    description: siteMetadata.description || "We're working on something amazing. Check back soon!",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function ComingSoonPage() {
  const siteMetadata = await getSiteMetadata();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: 'var(--font-primary)' }}>
          Coming Soon
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8" style={{ fontFamily: 'var(--font-secondary)' }}>
          {siteMetadata.description || "We're working on something amazing. Check back soon!"}
        </p>
        <div className="text-sm text-muted-foreground">
          <p>{siteMetadata.name}</p>
        </div>
      </div>
    </div>
  );
}
