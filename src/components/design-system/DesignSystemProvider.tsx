/**
 * Design System Provider Component
 * Injects CSS variables into the document based on design system settings
 * This component should be used in the root layout
 */

"use client";

import { useEffect } from "react";
import type { DesignSystemConfig } from "@/types/design-system";
import { designSystemToCSSVariables, generateGoogleFontsURL } from "@/lib/design-system";

interface DesignSystemProviderProps {
  config: DesignSystemConfig;
  children: React.ReactNode;
}

export function DesignSystemProvider({
  config,
  children,
}: DesignSystemProviderProps) {
  useEffect(() => {
    // Apply CSS variables to document root
    const cssVariables = designSystemToCSSVariables(config);
    const root = document.documentElement;

    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Load Google Fonts if needed
    if (config.fonts.primary.source === "google" || config.fonts.secondary.source === "google") {
      const googleFontsURL = generateGoogleFontsURL(config);
      
      if (googleFontsURL) {
        // Check if link already exists
        const existingLink = document.querySelector(
          `link[href*="fonts.googleapis.com"]`
        );

        if (!existingLink) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = googleFontsURL;
          document.head.appendChild(link);
        } else {
          // Update existing link if URL changed
          (existingLink as HTMLLinkElement).href = googleFontsURL;
        }
      }
    }

    // Cleanup function (optional - CSS variables persist, but we could reset them)
    return () => {
      // Optionally reset CSS variables on unmount
      // For now, we'll leave them as they persist across navigation
    };
  }, [config]);

  return <>{children}</>;
}
