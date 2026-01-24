"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DesignSystemConfig, FontConfig } from "@/types/design-system";
import { Type, Eye, Save } from "lucide-react";

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
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Type className="h-4 w-4" />
                Fonts
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure primary and secondary fonts for your site
              </CardDescription>
            </div>
            <Button
              onClick={onSave}
              disabled={saving}
              size="sm"
            >
              <Save className="h-3 w-3 mr-1.5" />
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          {/* Primary Font */}
          <div className="space-y-2">
            <Label className="text-sm">Primary Font</Label>
            <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-2">
            <Label className="text-sm">Secondary Font</Label>
            <div className="grid grid-cols-2 gap-3">
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

      {/* Preview Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-4 w-4" />
            Preview
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            See how your fonts look with your color palette
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div
            className="rounded-lg border p-4 space-y-4"
            style={{
              backgroundColor: config.colors.color04,
              color: config.colors.color06,
              borderColor: config.colors.color08,
            }}
          >
            {/* Typography Samples */}
            <div className="space-y-2">
              <h1
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-3xl font-bold"
              >
                Heading 1 - Main Title ({config.fonts.primary.family})
              </h1>
              <h2
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-2xl font-semibold"
              >
                Heading 2 - Section Title ({config.fonts.primary.family})
              </h2>
              <h3
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-xl font-semibold"
              >
                Heading 3 - Subsection ({config.fonts.primary.family})
              </h3>
              <p 
                style={{ 
                  color: config.colors.color06, 
                  lineHeight: "1.6",
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                }}
              >
                This is a sample paragraph using your primary font ({config.fonts.primary.family}). It demonstrates how body text will appear with your design system. The text should be readable and maintain good contrast with the background.
              </p>
              <p 
                style={{ 
                  color: config.colors.color07, 
                  lineHeight: "1.6",
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                }}
              >
                This is muted text using your foreground muted color with the primary font. It's perfect for secondary information, captions, or less important content.
              </p>
            </div>

            {/* Divider */}
            <div
              style={{ borderColor: config.colors.color08 }}
              className="border-t"
            />

            {/* Secondary Font Examples */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.secondary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Secondary Font Examples ({config.fonts.secondary.family})
              </h4>
              <p
                style={{
                  fontFamily: `"${config.fonts.secondary.family}", sans-serif`,
                  color: config.colors.color06,
                  lineHeight: "1.6",
                }}
              >
                This paragraph uses your secondary font ({config.fonts.secondary.family}). Secondary fonts are typically used for headings, quotes, or special emphasis to create visual variety in your design.
              </p>
              <blockquote
                style={{
                  fontFamily: `"${config.fonts.secondary.family}", sans-serif`,
                  color: config.colors.color07,
                  borderLeftColor: config.colors.color01,
                  borderLeftWidth: "3px",
                  borderLeftStyle: "solid",
                  paddingLeft: "1rem",
                  fontStyle: "italic",
                }}
                className="my-2"
              >
                "This is a blockquote using the secondary font. It's perfect for highlighting important quotes or testimonials."
              </blockquote>
            </div>

            {/* Divider */}
            <div
              style={{ borderColor: config.colors.color08 }}
              className="border-t"
            />

            {/* Font Weight Examples */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Font Weight Examples
              </h4>
              <div className="space-y-1">
                {config.fonts.primary.weights.map((weight) => (
                  <p
                    key={weight}
                    style={{
                      fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                      fontWeight: weight,
                      color: config.colors.color06,
                    }}
                  >
                    Weight {weight}: The quick brown fox jumps over the lazy dog
                  </p>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Buttons
              </h4>
              <div className="flex flex-wrap gap-3">
                <button
                  style={{
                    backgroundColor: config.colors.color01,
                    color: "#ffffff",
                    fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  }}
                  className="px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Primary Button
                </button>
                <button
                  style={{
                    backgroundColor: config.colors.color02,
                    color: "#ffffff",
                    fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  }}
                  className="px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Secondary Button
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Links
              </h4>
              <div className="space-y-1">
                <a
                  href="#"
                  style={{ 
                    color: config.colors.color09,
                    fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  }}
                  className="underline hover:opacity-80 transition-opacity"
                >
                  Primary Link - Click to navigate
                </a>
                <br />
                <a
                  href="#"
                  style={{ 
                    color: config.colors.color01,
                    fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  }}
                  className="underline hover:opacity-80 transition-opacity"
                >
                  Alternate Link Style
                </a>
              </div>
            </div>

            {/* Card/Container Sample */}
            <div
              className="rounded-lg p-3 space-y-1"
              style={{
                backgroundColor: config.colors.color05,
                borderColor: config.colors.color08,
                borderWidth: "1px",
                borderStyle: "solid",
              }}
            >
              <h5
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-sm font-semibold"
              >
                Card/Container Example
              </h5>
              <p 
                style={{ 
                  color: config.colors.color07, 
                  fontSize: "0.75rem",
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                }}
              >
                This is a card or container element using your background alt color and primary font. It's useful for grouping related content and creating visual hierarchy.
              </p>
            </div>

            {/* Form Elements */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Form Elements
              </h4>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Input field"
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: config.colors.color04,
                    color: config.colors.color06,
                    borderColor: config.colors.color08,
                    fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  }}
                />
                <textarea
                  placeholder="Textarea field"
                  rows={2}
                  className="w-full px-3 py-2 rounded-md border resize-none text-sm"
                  style={{
                    backgroundColor: config.colors.color04,
                    color: config.colors.color06,
                    borderColor: config.colors.color08,
                    fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  }}
                />
              </div>
            </div>

            {/* List Examples */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Lists
              </h4>
              <ul 
                className="list-disc list-inside space-y-1" 
                style={{ 
                  color: config.colors.color06,
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                }}
              >
                <li>First list item</li>
                <li>Second list item</li>
                <li>Third list item</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
