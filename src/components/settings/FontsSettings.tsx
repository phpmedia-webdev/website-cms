"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DesignSystemConfig, FontConfig } from "@/types/design-system";
import { Type } from "lucide-react";

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

interface FontsSettingsProps {
  config: DesignSystemConfig;
  onConfigChange: (config: DesignSystemConfig) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

export function FontsSettings({
  config,
  onConfigChange,
  onSave,
  saving,
  saved,
}: FontsSettingsProps) {
  const updateFont = (
    type: "primary" | "secondary",
    updates: Partial<FontConfig>
  ) => {
    onConfigChange({
      ...config,
      fonts: {
        ...config.fonts,
        [type]: {
          ...config.fonts[type],
          ...updates,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
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

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
