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
  // Load design system settings from database
  const { config, cssVariables, googleFontsURL } = await loadDesignSystem();

  // Convert CSS variables to inline style string (theme applied only on public layout, not admin)
  const cssVariablesStyle = Object.entries(cssVariables)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Load Google Fonts if needed */}
        {googleFontsURL && (
          <link rel="stylesheet" href={googleFontsURL} />
        )}
        {/* Inject CSS variables; body theme (background/text) is applied only in (public) layout */}
        <style dangerouslySetInnerHTML={{
          __html: `:root { ${cssVariablesStyle} }`
        }} />
      </head>
      <body>
        <PublicPageTracker />
        <DesignSystemProvider config={config}>
          {children}
        </DesignSystemProvider>
      </body>
    </html>
  );
}
