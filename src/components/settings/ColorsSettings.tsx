"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DesignSystemConfig, ColorPalette } from "@/types/design-system";
import { Palette, Eye, Save } from "lucide-react";
import { PaletteLibrary } from "./PaletteLibrary";

interface ColorsSettingsProps {
  config: DesignSystemConfig;
  onConfigChange: (config: DesignSystemConfig) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

/**
 * Convert hex color to RGB format
 */
function hexToRgb(hex: string): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle 3-digit hex codes
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;
  
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  return `rgb(${r}, ${g}, ${b})`;
}

export function ColorsSettings({
  config,
  onConfigChange,
  onSave,
  saving,
  saved,
}: ColorsSettingsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const updateColor = (key: keyof ColorPalette, value: string) => {
    onConfigChange({
      ...config,
      colors: {
        ...config.colors,
        [key]: value,
      },
    });
  };

  const handlePaletteSelect = (colors: ColorPalette) => {
    onConfigChange({
      ...config,
      colors,
    });
  };

  const handleHexInput = (key: keyof ColorPalette, raw: string) => {
    const hexMatch = raw.match(/#[0-9A-Fa-f]{6}/);
    if (hexMatch) updateColor(key, hexMatch[0]);
  };

  type ChipDef = { key: keyof ColorPalette; label: string };
  const renderChip = ({ key, label }: ChipDef) => {
    const value = config.colors[key];
    const id = `color-${key}`;
    return (
      <div key={key} className="flex flex-col">
        <Label htmlFor={id} className="text-sm font-medium mb-1.5">
          {label}
        </Label>
        <label htmlFor={id} className="cursor-pointer">
          <div
            className="w-full aspect-[2/1] rounded-lg border-2 border-border mb-2 hover:border-primary transition-colors"
            style={{ backgroundColor: value }}
            title={`Click to edit: ${value}`}
          />
        </label>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => updateColor(key, e.target.value)}
          className="hidden"
        />
        <Input
          type="text"
          value={`${value}  | ${hexToRgb(value)}`}
          onChange={(e) => handleHexInput(key, e.target.value)}
          className="text-sm text-center"
          placeholder={`${value}  | ${hexToRgb(value)}`}
        />
      </div>
    );
  };

  // 15 chips in display order: 3 rows × 5. Alternate 1 in row 2; Alternates 2–6 in row 3.
  const paletteChips: ChipDef[] = [
    { key: "primary", label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "accent", label: "Accent" },
    { key: "background", label: "Background" },
    { key: "backgroundAlt", label: "Background Alt" },
    { key: "foreground", label: "Foreground" },
    { key: "foregroundMuted", label: "Foreground Muted" },
    { key: "border", label: "Border" },
    { key: "link", label: "Link" },
    { key: "alternate1", label: "Alternate 1" },
    { key: "alternate2", label: "Alternate 2" },
    { key: "alternate3", label: "Alternate 3" },
    { key: "alternate4", label: "Alternate 4" },
    { key: "alternate5", label: "Alternate 5" },
    { key: "alternate6", label: "Alternate 6" },
  ];

  return (
    <div className="space-y-6">
      {/* Palette Library */}
      <PaletteLibrary
        currentColors={config.colors}
        onPaletteSelect={handlePaletteSelect}
        showSaveDialog={showSaveDialog}
        onSaveDialogChange={setShowSaveDialog}
      />

      {/* Colors Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Current Color Palette
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure your brand colors and theme colors
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="ml-4"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Current
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* 15 colors in 3 rows × 5: core 1–5, core 6–9 + alternate1, alternate2–6 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Brand & theme colors (15)</h3>
            <div className="grid grid-cols-5 gap-4">
              {paletteChips.map(renderChip)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            See how your design system looks
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div
            className="rounded-lg border p-4 space-y-3"
            style={{
              backgroundColor: config.colors.background,
              color: config.colors.foreground,
              fontFamily: `"${config.fonts.primary.family}", sans-serif`,
            }}
          >
            <h2
              style={{
                fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                color: config.colors.foreground,
              }}
              className="text-2xl font-bold"
            >
              Sample Heading
            </h2>
            <p style={{ color: config.colors.foregroundMuted }}>
              This is sample body text using your primary font and colors.
            </p>
            <div className="flex gap-2">
              <button
                style={{
                  backgroundColor: config.colors.primary,
                  color: "#ffffff",
                }}
                className="px-4 py-2 rounded-md font-medium"
              >
                Primary Button
              </button>
              <button
                style={{
                  backgroundColor: config.colors.secondary,
                  color: "#ffffff",
                }}
                className="px-4 py-2 rounded-md font-medium"
              >
                Secondary Button
              </button>
            </div>
            <a
              href="#"
              style={{ color: config.colors.link }}
              className="underline"
            >
              Sample Link
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
