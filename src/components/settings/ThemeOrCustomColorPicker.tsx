"use client";

import { BUTTON_THEME_COLOR_KEYS } from "@/types/design-system";
import type { ColorLabels, ColorPalette } from "@/types/design-system";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPickerWithAlpha } from "./ColorPickerWithAlpha";
import { cn } from "@/lib/utils";

function themeLabel(key: string, colorLabels?: ColorLabels | null): string {
  const label = colorLabels?.[key as keyof ColorLabels];
  if (typeof label === "string" && label.trim()) return label;
  const num = key.replace(/^color0?/, "") || "1";
  return `Color ${parseInt(num, 10)}`;
}

export interface ThemeOrCustomColorPickerProps {
  label: string;
  /** When set, theme mode is active and this key is selected. */
  themeKey?: string | null;
  /** Custom hex when in custom mode. */
  customValue?: string | null;
  customAlpha?: number | null;
  onThemeChange: (key: string | undefined) => void;
  onCustomChange: (hex: string | undefined, alpha: number | undefined) => void;
  themeColors: ColorPalette;
  colorLabels?: ColorLabels | null;
  placeholder?: string;
  fallbackHex?: string;
}

export function ThemeOrCustomColorPicker({
  label,
  themeKey,
  customValue,
  customAlpha,
  onThemeChange,
  onCustomChange,
  themeColors,
  colorLabels,
  placeholder = "transparent",
  fallbackHex = "#3b82f6",
}: ThemeOrCustomColorPickerProps) {
  const isTheme = themeKey != null && themeKey !== "";

  return (
    <div className="grid gap-1.5 min-w-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-2 items-center flex-wrap">
        <div
          role="tablist"
          className="inline-flex rounded-md border border-input bg-muted/50 p-0.5"
          aria-label={`${label}: choose theme or custom`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={isTheme}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              isTheme ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              onCustomChange(undefined, undefined);
              onThemeChange(themeKey || BUTTON_THEME_COLOR_KEYS[0]);
            }}
          >
            Theme
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isTheme}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              !isTheme ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              onThemeChange(undefined);
            }}
          >
            Custom
          </button>
        </div>
        {isTheme ? (
          <div className="flex-1 min-w-0">
            <Select
              value={themeKey || BUTTON_THEME_COLOR_KEYS[0]}
              onValueChange={(v) => onThemeChange(v)}
            >
              <SelectTrigger className="h-9 font-mono text-xs max-w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="bottom" position="popper">
                {BUTTON_THEME_COLOR_KEYS.map((key) => {
                  const hex = (themeColors as unknown as Record<string, string>)[key];
                  return (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {hex && (
                          <span
                            className="h-4 w-4 rounded border border-input shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                        )}
                        {themeLabel(key, colorLabels)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <ColorPickerWithAlpha
              value={customValue ?? undefined}
              alpha={customAlpha ?? undefined}
              onChange={onCustomChange}
              placeholder={placeholder}
              fallbackHex={fallbackHex}
            />
          </div>
        )}
      </div>
    </div>
  );
}
