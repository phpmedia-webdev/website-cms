"use client";

import { useState, useEffect } from "react";
import type { ButtonStyle, ColorPalette } from "@/types/design-system";
import { BUTTON_THEME_COLOR_KEYS } from "@/types/design-system";

/** Convert hex color + alpha (0–100) to rgba() string. Returns color as-is if alpha is 100 or color is not hex. */
export function colorWithAlpha(hex: string | undefined, alpha: number | undefined): string | undefined {
  if (!hex || hex === "transparent") return hex;
  const a = alpha != null ? alpha / 100 : 1;
  if (a >= 1 && (alpha == null || alpha >= 100)) return hex;
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Normalize CSS length: bare numbers get "px" so border/width values are valid. */
function normalizeLength(value: string | number | undefined): string | undefined {
  if (value == null || value === "") return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}px`;
  return s;
}

/** Resolve theme color key to hex from palette, or return undefined. */
export function resolveThemeColor(
  key: string | undefined,
  colors: ColorPalette | undefined
): string | undefined {
  if (!key || !colors || !BUTTON_THEME_COLOR_KEYS.includes(key as any)) return undefined;
  const hex = (colors as unknown as Record<string, string>)[key];
  return typeof hex === "string" && hex ? hex : undefined;
}

/** True if this style has any visual overrides (so we use inline style instead of className). */
export function buttonStyleHasVisual(s: ButtonStyle): boolean {
  return (
    (s.backgroundColorTheme != null && s.backgroundColorTheme !== "") ||
    (s.backgroundColor != null && s.backgroundColor !== "") ||
    (s.colorTheme != null && s.colorTheme !== "") ||
    (s.color != null && s.color !== "") ||
    (s.borderColorTheme != null && s.borderColorTheme !== "") ||
    (s.borderColor != null && s.borderColor !== "") ||
    (s.borderWidth != null && s.borderWidth !== "") ||
    (s.borderRadius != null && s.borderRadius !== "") ||
    (s.paddingX != null && s.paddingX !== "") ||
    (s.paddingY != null && s.paddingY !== "")
  );
}

/** Build inline style object from button style visual props (for preview and render). */
export function buttonStyleToInlineStyle(
  s: ButtonStyle,
  options?: { fontFamily?: string; colors?: ColorPalette }
): React.CSSProperties {
  const colors = options?.colors;
  const out: React.CSSProperties = {
    ...(options?.fontFamily && { fontFamily: options.fontFamily }),
  };
  const bgHex = s.backgroundColorTheme ? resolveThemeColor(s.backgroundColorTheme, colors) : undefined;
  const bgCustom = s.backgroundColor ? (colorWithAlpha(s.backgroundColor, s.backgroundColorAlpha) ?? s.backgroundColor) : undefined;
  const backgroundColor = bgHex ?? bgCustom;
  if (backgroundColor) out.backgroundColor = backgroundColor;
  else if (buttonStyleHasVisual(s)) out.backgroundColor = "transparent";
  const textHex = s.colorTheme ? resolveThemeColor(s.colorTheme, colors) : undefined;
  const textCustom = s.color ? (colorWithAlpha(s.color, s.colorAlpha) ?? s.color) : undefined;
  if (textHex) out.color = textHex;
  else if (textCustom) out.color = textCustom;
  const borderHex = s.borderColorTheme ? resolveThemeColor(s.borderColorTheme, colors) : undefined;
  const borderCustom = s.borderColor ? (colorWithAlpha(s.borderColor, s.borderColorAlpha) ?? s.borderColor) : undefined;
  const borderColorValue = borderHex ?? borderCustom ?? "currentColor";
  const borderWidthNorm = normalizeLength(s.borderWidth);
  if (borderWidthNorm) {
    out.border = `${borderWidthNorm} solid ${borderColorValue}`;
  } else if (borderHex || borderCustom) {
    out.borderColor = borderColorValue;
  }
  const radiusNorm = normalizeLength(s.borderRadius);
  if (radiusNorm) out.borderRadius = radiusNorm;
  if (s.paddingX) {
    out.paddingLeft = s.paddingX;
    out.paddingRight = s.paddingX;
  }
  if (s.paddingY) {
    out.paddingTop = s.paddingY;
    out.paddingBottom = s.paddingY;
  }
  if (buttonStyleHasVisual(s)) {
    if (!s.paddingX && !s.paddingY) {
      out.paddingLeft = out.paddingRight = "0.75rem";
      out.paddingTop = out.paddingBottom = "0.5rem";
    }
    if (backgroundColor && !out.color) out.color = "#ffffff";
  }
  return out;
}

interface ButtonStylesPreviewProps {
  /** Optional font family string for preview (e.g. from design system primary font). */
  fontFamily?: string;
  className?: string;
  /** When provided, use these styles instead of fetching (e.g. from parent Style page). */
  styles?: ButtonStyle[] | null;
  /** Theme colors to resolve theme refs in button styles. */
  themeColors?: ColorPalette | null;
}

/**
 * Displays all button styles. Used in Fonts and Colors preview sections.
 * When `styles` prop is provided (array), uses it; when null, parent is loading; when undefined, fetches from API.
 */
export function ButtonStylesPreview({ fontFamily, className, styles: stylesProp, themeColors }: ButtonStylesPreviewProps) {
  const [fetchedStyles, setFetchedStyles] = useState<ButtonStyle[]>([]);
  const [loading, setLoading] = useState(stylesProp === undefined);

  const isFromParent = stylesProp !== undefined;
  const styles = isFromParent ? (Array.isArray(stylesProp) ? stylesProp : []) : fetchedStyles;

  useEffect(() => {
    if (stylesProp !== undefined) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/settings/button-styles", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        return r.ok && Array.isArray(data) ? data : [];
      })
      .then(setFetchedStyles)
      .catch(() => setFetchedStyles([]))
      .finally(() => setLoading(false));
  }, [stylesProp]);

  if (stylesProp === null || (!isFromParent && loading)) {
    return <p className="text-sm text-muted-foreground">Loading button styles…</p>;
  }

  if (styles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No button styles yet. Add and customize them in the Buttons tab.
      </p>
    );
  }

  // Fallback look when style has no custom colors (so preview is visible without theme CSS)
  const fallbackButtonStyle: React.CSSProperties = {
    backgroundColor: "#e5e7eb",
    color: "#374151",
    border: "1px solid #d1d5db",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.375rem",
  };

  return (
    <div className={className ?? "flex flex-wrap gap-3"}>
      {styles.map((s) => {
        const hasVisual = buttonStyleHasVisual(s);
        const inlineStyle = buttonStyleToInlineStyle(s, {
          fontFamily: fontFamily ?? undefined,
          colors: themeColors ?? undefined,
        });
        const resolvedStyle: React.CSSProperties = hasVisual
          ? inlineStyle
          : { ...fallbackButtonStyle, ...inlineStyle };
        return (
          <button
            key={s.slug}
            type="button"
            className="font-medium hover:opacity-90 transition-opacity rounded text-sm"
            style={resolvedStyle}
          >
            {s.label || s.slug}
          </button>
        );
      })}
    </div>
  );
}
