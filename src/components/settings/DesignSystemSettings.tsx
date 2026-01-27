"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { DesignSystemConfig, FontConfig, ColorPalette } from "@/types/design-system";
import { DEFAULT_DESIGN_SYSTEM } from "@/types/design-system";
import { Palette, Type, Eye } from "lucide-react";
import { PaletteLibrary } from "./PaletteLibrary";

// Popular Google Fonts list (curated selection)
const POPULAR_GOOGLE_FONTS = [
  { family: "Inter", weights: [400, 500, 600, 700] },
  { family: "Roboto", weights: [400, 500, 700] },
  { family: "Open Sans", weights: [400, 600, 700] },
  { family: "Lato", weights: [400, 700] },
  { family: "Montserrat", weights: [400, 500, 600, 700] },
  { family: "Poppins", weights: [400, 500, 600, 700] },
  { family: "Raleway", weights: [400, 500, 600, 700] },
  { family: "Source Sans Pro", weights: [400, 600, 700] },
  { family: "Nunito", weights: [400, 600, 700] },
  { family: "Playfair Display", weights: [400, 700] },
  { family: "Merriweather", weights: [400, 700] },
  { family: "Oswald", weights: [400, 600, 700] },
  { family: "Ubuntu", weights: [400, 500, 700] },
  { family: "Crimson Text", weights: [400, 600] },
  { family: "Lora", weights: [400, 700] },
];

interface DesignSystemSettingsProps {
  initialConfig?: DesignSystemConfig;
}

export function DesignSystemSettings({ initialConfig }: DesignSystemSettingsProps) {
  const [config, setConfig] = useState<DesignSystemConfig>(
    initialConfig || DEFAULT_DESIGN_SYSTEM
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const updateFont = (
    type: "primary" | "secondary",
    updates: Partial<FontConfig>
  ) => {
    setConfig((prev) => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [type]: {
          ...prev.fonts[type],
          ...updates,
        },
      },
    }));
  };

  const updateColor = (key: keyof ColorPalette, value: string) => {
    setConfig((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch("/api/admin/settings/design-system", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      // Reload page to apply changes
      window.location.reload();
    } catch (error) {
      console.error("Error saving design system settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePaletteSelect = (colors: ColorPalette) => {
    setConfig((prev) => ({
      ...prev,
      colors,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Fonts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Fonts
          </CardTitle>
          <CardDescription>
            Configure primary and secondary fonts for your site
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Font */}
          <div className="space-y-4">
            <Label>Primary Font</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary-font-family" className="text-xs text-muted-foreground">
                  Font Family
                </Label>
                <select
                  id="primary-font-family"
                  value={config.fonts.primary.family}
                  onChange={(e) => {
                    const selectedFont = POPULAR_GOOGLE_FONTS.find(
                      (f) => f.family === e.target.value
                    );
                    if (selectedFont) {
                      updateFont("primary", {
                        family: selectedFont.family,
                        weights: selectedFont.weights,
                      });
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {POPULAR_GOOGLE_FONTS.map((font) => (
                    <option key={font.family} value={font.family}>
                      {font.family}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="primary-font-source" className="text-xs text-muted-foreground">
                  Source
                </Label>
                <select
                  id="primary-font-source"
                  value={config.fonts.primary.source}
                  onChange={(e) =>
                    updateFont("primary", {
                      source: e.target.value as "google" | "system" | "custom",
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="google">Google Fonts</option>
                  <option value="system">System Fonts</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Secondary Font */}
          <div className="space-y-4">
            <Label>Secondary Font</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="secondary-font-family" className="text-xs text-muted-foreground">
                  Font Family
                </Label>
                <select
                  id="secondary-font-family"
                  value={config.fonts.secondary.family}
                  onChange={(e) => {
                    const selectedFont = POPULAR_GOOGLE_FONTS.find(
                      (f) => f.family === e.target.value
                    );
                    if (selectedFont) {
                      updateFont("secondary", {
                        family: selectedFont.family,
                        weights: selectedFont.weights,
                      });
                    }
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {POPULAR_GOOGLE_FONTS.map((font) => (
                    <option key={font.family} value={font.family}>
                      {font.family}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="secondary-font-source" className="text-xs text-muted-foreground">
                  Source
                </Label>
                <select
                  id="secondary-font-source"
                  value={config.fonts.secondary.source}
                  onChange={(e) =>
                    updateFont("secondary", {
                      source: e.target.value as "google" | "system" | "custom",
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="google">Google Fonts</option>
                  <option value="system">System Fonts</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Palette Library */}
      <PaletteLibrary
        currentColors={config.colors}
        onPaletteSelect={handlePaletteSelect}
      />

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette
          </CardTitle>
          <CardDescription>
            Configure your brand colors and theme colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Core Colors Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Core Colors (9)</h3>
            <div className="grid grid-cols-3 gap-4">
              {/* Row 1 */}
              <div>
                <Label htmlFor="color-primary">Primary</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-primary"
                    type="color"
                    value={config.colors.color01}
                    onChange={(e) => updateColor("color01", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color01}
                    onChange={(e) => updateColor("color01", e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-secondary">Secondary</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-secondary"
                    type="color"
                    value={config.colors.color02}
                    onChange={(e) => updateColor("color02", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color02}
                    onChange={(e) => updateColor("color02", e.target.value)}
                    placeholder="#8b5cf6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-accent">Accent</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-accent"
                    type="color"
                    value={config.colors.color03}
                    onChange={(e) => updateColor("color03", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color03}
                    onChange={(e) => updateColor("color03", e.target.value)}
                    placeholder="#06b6d4"
                    className="flex-1"
                  />
                </div>
              </div>
              {/* Row 2 */}
              <div>
                <Label htmlFor="color-background">Background</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-background"
                    type="color"
                    value={config.colors.color04}
                    onChange={(e) => updateColor("color04", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color04}
                    onChange={(e) => updateColor("color04", e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-background-alt">Background Alt</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-background-alt"
                    type="color"
                    value={config.colors.color05}
                    onChange={(e) => updateColor("color05", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color05}
                    onChange={(e) => updateColor("color05", e.target.value)}
                    placeholder="#f9fafb"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-foreground">Foreground</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-foreground"
                    type="color"
                    value={config.colors.color06}
                    onChange={(e) => updateColor("color06", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color06}
                    onChange={(e) => updateColor("color06", e.target.value)}
                    placeholder="#111827"
                    className="flex-1"
                  />
                </div>
              </div>
              {/* Row 3 */}
              <div>
                <Label htmlFor="color-foreground-muted">Foreground Muted</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-foreground-muted"
                    type="color"
                    value={config.colors.color07}
                    onChange={(e) => updateColor("color07", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color07}
                    onChange={(e) => updateColor("color07", e.target.value)}
                    placeholder="#6b7280"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-border">Border</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-border"
                    type="color"
                    value={config.colors.color08}
                    onChange={(e) => updateColor("color08", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color08}
                    onChange={(e) => updateColor("color08", e.target.value)}
                    placeholder="#e5e7eb"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-link">Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-link"
                    type="color"
                    value={config.colors.color09}
                    onChange={(e) => updateColor("color09", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color09}
                    onChange={(e) => updateColor("color09", e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Alternate Colors Section */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Alternate Colors (6)</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="color-alternate-1">Alternate 1</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-alternate-1"
                    type="color"
                    value={config.colors.color10}
                    onChange={(e) => updateColor("color10", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color10}
                    onChange={(e) => updateColor("color10", e.target.value)}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-alternate-2">Alternate 2</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-alternate-2"
                    type="color"
                    value={config.colors.color11}
                    onChange={(e) => updateColor("color11", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color11}
                    onChange={(e) => updateColor("color11", e.target.value)}
                    placeholder="#f59e0b"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-alternate-3">Alternate 3</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-alternate-3"
                    type="color"
                    value={config.colors.color12}
                    onChange={(e) => updateColor("color12", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color12}
                    onChange={(e) => updateColor("color12", e.target.value)}
                    placeholder="#ef4444"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-alternate-4">Alternate 4</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-alternate-4"
                    type="color"
                    value={config.colors.color13}
                    onChange={(e) => updateColor("color13", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color13}
                    onChange={(e) => updateColor("color13", e.target.value)}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-alternate-5">Alternate 5</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-alternate-5"
                    type="color"
                    value={config.colors.color14}
                    onChange={(e) => updateColor("color14", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color14}
                    onChange={(e) => updateColor("color14", e.target.value)}
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="color-alternate-6">Alternate 6</Label>
                <div className="flex gap-2">
                  <Input
                    id="color-alternate-6"
                    type="color"
                    value={config.colors.color15}
                    onChange={(e) => updateColor("color15", e.target.value)}
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={config.colors.color15}
                    onChange={(e) => updateColor("color15", e.target.value)}
                    placeholder="#8b5a2b"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription>
            See how your design system looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg border p-6 space-y-4"
            style={{
              backgroundColor: config.colors.color04,
              color: config.colors.color06,
              fontFamily: `"${config.fonts.primary.family}", sans-serif`,
            }}
          >
            <h2
              style={{
                fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                color: config.colors.color06,
              }}
              className="text-2xl font-bold"
            >
              Sample Heading
            </h2>
            <p style={{ color: config.colors.color07 }}>
              This is sample body text using your primary font and colors.
            </p>
            <div className="flex gap-2">
              <button
                style={{
                  backgroundColor: config.colors.color01,
                  color: "#ffffff",
                }}
                className="px-4 py-2 rounded-md font-medium"
              >
                Primary Button
              </button>
              <button
                style={{
                  backgroundColor: config.colors.color02,
                  color: "#ffffff",
                }}
                className="px-4 py-2 rounded-md font-medium"
              >
                Secondary Button
              </button>
            </div>
            <a
              href="#"
              style={{ color: config.colors.color09 }}
              className="underline"
            >
              Sample Link
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
