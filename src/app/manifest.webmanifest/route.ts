import { NextResponse } from "next/server";
import type { MetadataRoute } from "next";
import { getPwaSettings, getPwaIconUrl } from "@/lib/pwa/settings";

/**
 * GET /manifest.webmanifest
 * Serves the PWA manifest from tenant PWA settings (name, colors, icon from media or URL).
 */
export async function GET() {
  try {
    const settings = await getPwaSettings();
    const iconUrl = await getPwaIconUrl(settings);

    const manifest: MetadataRoute.Manifest = {
      name: settings.name ?? "Site Status",
      short_name: settings.short_name ?? "Status",
      description: "Admin status dashboard and notifications",
      start_url: "/status",
      display: "standalone",
      background_color: settings.background_color ?? "#ffffff",
      theme_color: settings.theme_color ?? "#0f172a",
      scope: "/",
      icons: iconUrl
        ? [
            { src: iconUrl, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any" },
          ]
        : [
            { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          ],
    };

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("Manifest route error:", err);
    return NextResponse.json(
      { error: "Failed to generate manifest" },
      { status: 500 }
    );
  }
}
