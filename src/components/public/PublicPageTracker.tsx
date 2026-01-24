"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Client component that tracks the last visited public page.
 * Stores the URL in localStorage so the admin "Back to Website" button
 * can navigate to the correct public page, not just browser history.
 */
export function PublicPageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Only track public pages (not admin or API routes)
    const isPublicPage = 
      pathname && 
      !pathname.startsWith("/admin") && 
      !pathname.startsWith("/api");

    if (isPublicPage) {
      // Store the full URL including pathname and search params
      // Normalize root path to "/"
      const normalizedPath = pathname === "/" ? "/" : pathname;
      const fullUrl = normalizedPath + window.location.search;
      localStorage.setItem("lastPublicPage", fullUrl);
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
