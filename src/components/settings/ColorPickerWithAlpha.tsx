"use client";

import { useState, useRef, useEffect } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import { CircleSlash } from "lucide-react";

/** Convert hex (6-char) + alpha 0-100 to #rrggbbaa. */
function toHexAlpha(hex: string | undefined, alpha: number | undefined): string {
  const a = alpha != null ? Math.round((alpha / 100) * 255) : 255;
  const aa = a.toString(16).padStart(2, "0");
  if (!hex || hex === "transparent") return `#000000${aa}`;
  const six = hex.startsWith("#") ? hex.slice(1, 7) : hex.slice(0, 6);
  if (six.length !== 6) return `#000000${aa}`;
  return `#${six}${aa}`;
}

/** Parse #rrggbbaa to { hex: "#rrggbb", alpha: 0-100 }. */
function fromHexAlpha(hexAlpha: string): { hex: string; alpha: number } {
  const s = hexAlpha.startsWith("#") ? hexAlpha.slice(1) : hexAlpha;
  const hex = `#${s.slice(0, 6)}`;
  const aa = s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255;
  const alpha = Math.round((aa / 255) * 100);
  return { hex, alpha };
}

/** #rrggbbaa to rgba(r,g,b,a) for swatch display. */
function hexAlphaToRgba(hexAlpha: string): string {
  const s = hexAlpha.startsWith("#") ? hexAlpha.slice(1) : hexAlpha;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length >= 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r},${g},${b},${a})`;
}

export interface ColorPickerWithAlphaProps {
  /** Current hex color (e.g. #3b82f6). */
  value?: string;
  /** Current alpha 0-100. */
  alpha?: number;
  onChange: (hex: string | undefined, alpha: number | undefined) => void;
  placeholder?: string;
  /** Label for the swatch (e.g. "Background"). */
  label?: string;
  /** Swatch fallback when no color (e.g. #3b82f6 for native color input). */
  fallbackHex?: string;
}

export function ColorPickerWithAlpha({
  value,
  alpha,
  onChange,
  placeholder = "transparent",
  label,
  fallbackHex = "#3b82f6",
}: ColorPickerWithAlphaProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const hexAlpha = toHexAlpha(value || fallbackHex, alpha ?? 100);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-color-picker-swatch]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handlePickerChange = (hexAlphaStr: string) => {
    const { hex, alpha: a } = fromHexAlpha(hexAlphaStr);
    onChange(hex, a);
  };

  const handleClear = () => {
    onChange(undefined, undefined);
    setOpen(false);
  };

  return (
    <div className="grid gap-1 relative" ref={panelRef}>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex gap-1 items-center">
        <button
          type="button"
          data-color-picker-swatch
          onClick={() => setOpen((o) => !o)}
          className="h-9 w-10 rounded border border-input shrink-0 cursor-pointer overflow-hidden"
          style={
            value
              ? {
                  backgroundImage: `linear-gradient(${hexAlphaToRgba(toHexAlpha(value, alpha ?? 100))}, ${hexAlphaToRgba(toHexAlpha(value, alpha ?? 100))}), linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                  backgroundSize: "100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px",
                  backgroundPosition: "0 0, 0 0, 4px 0, 4px -4px, 0 4px",
                }
              : { backgroundColor: "var(--muted)" }
          }
          title={value ? `${value} ${alpha ?? 100}%` : placeholder}
        />
        {open && (
          <div className="absolute left-0 top-full mt-1 z-50 rounded-lg border bg-background p-2 shadow-lg">
            <HexAlphaColorPicker
              color={hexAlpha}
              onChange={handlePickerChange}
              style={{ width: 200, height: 160 }}
            />
            <div className="flex justify-between items-center mt-2 gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                {value ? toHexAlpha(value ?? "#000000", alpha ?? 100) : "—"}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                <CircleSlash className="h-3.5 w-3.5 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          title={`No color (${placeholder})`}
          onClick={handleClear}
        >
          <CircleSlash className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
