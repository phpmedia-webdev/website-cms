import { useState, useCallback } from "react";

/**
 * Hook for managing slug generation from title.
 */
export function useSlug(initialSlug: string = "") {
  const [slug, setSlug] = useState(initialSlug);

  const slugFromTitle = useCallback((title: string) => {
    const generated = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
    setSlug(generated);
  }, []);

  return [slug, setSlug, slugFromTitle] as const;
}
