"use client";

import { useState, useEffect } from "react";
import type { FormStyle, ColorPalette } from "@/types/design-system";
import { formStyleToCss } from "@/components/editor/FormEmbed";

interface FormStylesPreviewProps {
  /** Form styles to preview (from Style page or API). */
  styles?: FormStyle[] | null;
  /** Theme colors to resolve form style theme refs. */
  themeColors?: ColorPalette | null;
  className?: string;
}

/**
 * Renders a small sample form for each form style. Used in Fonts and Colors preview sections.
 */
export function FormStylesPreview({
  styles: stylesProp,
  themeColors,
  className,
}: FormStylesPreviewProps) {
  const [fetchedStyles, setFetchedStyles] = useState<FormStyle[]>([]);
  const [loading, setLoading] = useState(stylesProp === undefined);

  const isFromParent = stylesProp !== undefined;
  const styles = isFromParent ? (stylesProp ?? []) : fetchedStyles;

  useEffect(() => {
    if (!isFromParent) {
      setLoading(true);
      fetch("/api/settings/form-styles", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setFetchedStyles(Array.isArray(data) ? data : []))
        .catch(() => setFetchedStyles([]))
        .finally(() => setLoading(false));
    }
  }, [isFromParent]);

  if (loading && styles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Loading form styles…</p>
    );
  }

  if (styles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No form styles yet. Add styles in the Forms tab to see previews here.
      </p>
    );
  }

  const palette = themeColors ?? ({} as ColorPalette);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-4">
        {styles.map((style) => {
          const { container, label: labelStyle, input: inputStyle, submit: submitStyle } = formStyleToCss(style, palette);
          return (
            <div key={style.slug} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {style.label}
              </span>
              <div
                className="rounded-md p-3 space-y-2 min-w-[180px]"
                style={Object.keys(container).length ? container : undefined}
              >
                <label
                  className="block text-sm font-medium"
                  style={Object.keys(labelStyle).length ? labelStyle : undefined}
                >
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  readOnly
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  style={Object.keys(inputStyle).length ? inputStyle : undefined}
                />
                <button
                  type="button"
                  disabled
                  className="rounded-md px-3 py-1.5 text-sm font-medium"
                  style={Object.keys(submitStyle).length ? submitStyle : undefined}
                >
                  Submit
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
