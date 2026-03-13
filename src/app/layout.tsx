import type { Metadata } from "next";
import "./globals.css";
import { loadDesignSystem } from "@/lib/design-system";
import { DesignSystemProvider } from "@/components/design-system/DesignSystemProvider";
import { PublicPageTracker } from "@/components/public/PublicPageTracker";

// Force dynamic so build never runs layout/page code (avoids Supabase/cookies during static generation).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CMS Admin",
  description: "Headless CMS Administration",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Load design system; on any failure use minimal defaults so layout always renders (CSS stays applied).
  let config: Awaited<ReturnType<typeof loadDesignSystem>>["config"];
  let cssVariablesStyle = "";
  let googleFontsURL: string | null = null;
  try {
    const loaded = await loadDesignSystem();
    config = loaded.config;
    googleFontsURL = loaded.googleFontsURL || null;
    cssVariablesStyle = Object.entries(loaded.cssVariables)
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ");
  } catch (e) {
    console.error("Root layout: design system load failed, using defaults.", e);
    const { DEFAULT_DESIGN_SYSTEM } = await import("@/types/design-system");
    const { designSystemToCSSVariables, generateGoogleFontsURL } = await import("@/lib/design-system");
    config = DEFAULT_DESIGN_SYSTEM;
    cssVariablesStyle = Object.entries(designSystemToCSSVariables(DEFAULT_DESIGN_SYSTEM))
      .map(([key, value]) => `${key}: ${value};`)
      .join(" ");
    googleFontsURL = generateGoogleFontsURL(DEFAULT_DESIGN_SYSTEM);
  }

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        {googleFontsURL && (
          <link rel="stylesheet" href={googleFontsURL} />
        )}
        <style dangerouslySetInnerHTML={{
          __html: `:root { ${cssVariablesStyle} }`
        }} />
      </head>
      <body>
        <PublicPageTracker />
        <DesignSystemProvider config={config!}>
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
}
