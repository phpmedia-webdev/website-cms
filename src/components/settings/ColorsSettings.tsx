"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DesignSystemConfig, ColorPalette, ColorLabels } from "@/types/design-system";
import { Palette, Eye, Save, X } from "lucide-react";
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
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;
  
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert hex color to HSL format
 */
function hexToHsl(hex: string): string {
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(char => char + char).join('')
    : cleanHex;
  
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

export function ColorsSettings({
  config,
  onConfigChange,
  onSave,
  saving,
  saved,
}: ColorsSettingsProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedColorKey, setSelectedColorKey] = useState<keyof ColorPalette | null>(null);
  const [originalColorValue, setOriginalColorValue] = useState<string | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<keyof ColorPalette | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [tempLabelValue, setTempLabelValue] = useState("");
  const colorGridRef = useRef<HTMLDivElement>(null);

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectedForSwap &&
        colorGridRef.current &&
        !colorGridRef.current.contains(event.target as Node)
      ) {
        setSelectedForSwap(null);
      }
    };

    if (selectedForSwap) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [selectedForSwap]);

  const updateColor = (key: keyof ColorPalette, value: string) => {
    onConfigChange({
      ...config,
      colors: {
        ...config.colors,
        [key]: value,
      },
    });
  };

  const updateLabel = (key: keyof ColorPalette, label: string) => {
    const currentLabels = config.colorLabels || {};
    onConfigChange({
      ...config,
      colorLabels: {
        ...currentLabels,
        [key]: label,
      },
    });
  };

  const handlePaletteSelect = (colors: ColorPalette) => {
    onConfigChange({
      ...config,
      colors,
    });
    // Clear swap selection when palette changes
    setSelectedForSwap(null);
  };

  const handleHexInput = (key: keyof ColorPalette, raw: string) => {
    const hexMatch = raw.match(/#[0-9A-Fa-f]{6}/);
    if (hexMatch) updateColor(key, hexMatch[0]);
  };

  const getColorLabel = (key: keyof ColorPalette): string => {
    return config.colorLabels?.[key] || `Color ${key.replace('color', '')}`;
  };

  const handleLabelEdit = (key: keyof ColorPalette) => {
    setEditingLabel(key);
    setTempLabelValue(getColorLabel(key));
  };

  const handleLabelSave = (key: keyof ColorPalette) => {
    if (tempLabelValue.trim()) {
      updateLabel(key, tempLabelValue.trim());
    }
    setEditingLabel(null);
    setTempLabelValue("");
  };

  const handleLabelCancel = () => {
    setEditingLabel(null);
    setTempLabelValue("");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Handle color swap when clicking chips
  // Labels stay with their slots, only color values swap
  const handleColorSwap = (fromKey: keyof ColorPalette, toKey: keyof ColorPalette) => {
    if (fromKey === toKey) return; // No swap needed
    
    const fromColor = config.colors[fromKey];
    const toColor = config.colors[toKey];
    
    // Swap the color VALUES (labels stay with their slots)
    onConfigChange({
      ...config,
      colors: {
        ...config.colors,
        [fromKey]: toColor,
        [toKey]: fromColor,
      },
    });
  };

  // Handle chip click - select for swap or swap if already selected
  const handleChipClick = (key: keyof ColorPalette) => {
    if (selectedForSwap === null) {
      // No chip selected - select this one
      setSelectedForSwap(key);
    } else if (selectedForSwap === key) {
      // Same chip clicked - deselect
      setSelectedForSwap(null);
    } else {
      // Different chip clicked - swap colors
      handleColorSwap(selectedForSwap, key);
      setSelectedForSwap(null);
    }
  };

  // Handle double-click to open modal
  const handleChipDoubleClick = (key: keyof ColorPalette) => {
    setSelectedForSwap(null); // Clear swap selection
    // Save original color value for cancel/revert
    setOriginalColorValue(config.colors[key]);
    setSelectedColorKey(key);
  };

  // Handle modal save - just close (changes already applied)
  const handleModalSave = () => {
    setSelectedColorKey(null);
    setOriginalColorValue(null);
  };

  // Handle modal cancel - revert to original value
  const handleModalCancel = () => {
    if (selectedColorKey && originalColorValue !== null) {
      updateColor(selectedColorKey, originalColorValue);
    }
    setSelectedColorKey(null);
    setOriginalColorValue(null);
  };

  // Generate array of color keys (color01-color15)
  const colorKeys: (keyof ColorPalette)[] = [
    "color01", "color02", "color03", "color04", "color05",
    "color06", "color07", "color08", "color09", "color10",
    "color11", "color12", "color13", "color14", "color15",
  ];

  const renderColorChip = (key: keyof ColorPalette) => {
    const value = config.colors[key];
    const label = getColorLabel(key);
    const isEditingLabel = editingLabel === key;
    const isSelectedForSwap = selectedForSwap === key;

    return (
      <div key={key} className="flex flex-col">
        {/* Label above chip */}
        <div className="mb-1">
          {isEditingLabel ? (
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={tempLabelValue}
                onChange={(e) => setTempLabelValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLabelSave(key);
                  if (e.key === 'Escape') handleLabelCancel();
                }}
                className="text-xs h-7"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => handleLabelSave(key)}
              >
                <Save className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleLabelCancel}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => handleLabelEdit(key)}
              title="Click to edit label"
            >
              <Label className="text-xs font-medium cursor-pointer group-hover:text-primary transition-colors">
                {label}
              </Label>
              <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                Edit
              </span>
            </div>
          )}
        </div>

        {/* Color chip - click to select/swap, double-click to edit */}
        <button
          type="button"
          onClick={() => handleChipClick(key)}
          onDoubleClick={() => handleChipDoubleClick(key)}
          className={`w-full h-12 rounded-md border-2 transition-all ${
            isSelectedForSwap
              ? "ring-2 ring-primary ring-offset-1 border-primary scale-105"
              : "border-border hover:border-primary"
          }`}
          style={{ backgroundColor: value }}
          title={
            isSelectedForSwap
              ? `Selected - Click another chip to swap, or click again to deselect. Double-click to edit.`
              : `Click to select for swap, double-click to edit: ${value}`
          }
        />

        {/* Hidden color input for direct editing */}
        <input
          type="color"
          value={value}
          onChange={(e) => updateColor(key, e.target.value)}
          className="hidden"
        />
      </div>
    );
  };

  const selectedColor = selectedColorKey ? config.colors[selectedColorKey] : null;
  const selectedLabel = selectedColorKey ? getColorLabel(selectedColorKey) : null;

  return (
    <div className="space-y-4">
      {/* Palette Library */}
      <PaletteLibrary
        currentColors={config.colors}
        onPaletteSelect={handlePaletteSelect}
        showSaveDialog={showSaveDialog}
        onSaveDialogChange={setShowSaveDialog}
      />

      {/* Colors Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-4 w-4" />
                Current Color Palette
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Click a chip to select it, then click another to swap colors. Double-click to edit. Labels stay with their slots.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="ml-4"
            >
              <Save className="h-3 w-3 mr-1.5" />
              Save Current
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {/* Helper message when chip is selected */}
          {selectedForSwap && (
            <div className="bg-primary/10 border border-primary/20 rounded-md p-2 text-xs">
              <p className="text-primary font-medium">
                Chip selected: <span className="font-mono">{getColorLabel(selectedForSwap)}</span>
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Click another chip to swap colors, click the same chip to deselect, or click outside to cancel.
              </p>
            </div>
          )}

          {/* 15 colors in responsive grid: 5 cols → 3 → 2 → 1 */}
          <div ref={colorGridRef}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {colorKeys.map(renderColorChip)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Color Detail Modal */}
      {selectedColorKey && selectedColor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedLabel} - Color Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleModalCancel}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Large color preview */}
              <div className="flex items-center gap-4">
                <div
                  className="w-24 h-24 rounded-lg border-2 border-border"
                  style={{ backgroundColor: selectedColor }}
                />
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Color Value</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={selectedColor}
                        onChange={(e) => handleHexInput(selectedColorKey, e.target.value)}
                        className="font-mono"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(selectedColor)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => updateColor(selectedColorKey, e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Color formats */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">RGB</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={hexToRgb(selectedColor)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(hexToRgb(selectedColor))}
                      title="Copy RGB"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">HSL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={hexToHsl(selectedColor)}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(hexToHsl(selectedColor))}
                      title="Copy HSL"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* CSS Variable reference */}
              <div>
                <Label className="text-xs text-muted-foreground">CSS Variable</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={`--color-${selectedColorKey}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => copyToClipboard(`--color-${selectedColorKey}`)}
                    title="Copy CSS Variable"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
                {config.colorLabels?.[selectedColorKey] && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Label Variable</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={`--color-${config.colorLabels[selectedColorKey]?.toLowerCase().replace(/\s+/g, '-')}`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => copyToClipboard(`--color-${config.colorLabels![selectedColorKey]!.toLowerCase().replace(/\s+/g, '-')}`)}
                        title="Copy Label CSS Variable"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleModalCancel}
              >
                Cancel
              </Button>
              <Button onClick={handleModalSave}>
                Save
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Preview Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-4 w-4" />
            Preview
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            See how your design system looks
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div
            className="rounded-lg border p-4 space-y-4"
            style={{
              backgroundColor: config.colors.color04,
              color: config.colors.color06,
              fontFamily: `"${config.fonts.primary.family}", sans-serif`,
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
                Heading 1 - Main Title
              </h1>
              <h2
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-2xl font-semibold"
              >
                Heading 2 - Section Title
              </h2>
              <h3
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-xl font-semibold"
              >
                Heading 3 - Subsection
              </h3>
              <p style={{ color: config.colors.color06, lineHeight: "1.6" }}>
                This is a sample paragraph using your primary font and foreground color. It demonstrates how body text will appear with your design system. The text should be readable and maintain good contrast with the background.
              </p>
              <p style={{ color: config.colors.color07, lineHeight: "1.6" }}>
                This is muted text using your foreground muted color. It&apos;s perfect for secondary information, captions, or less important content that still needs to be visible but not as prominent.
              </p>
            </div>

            {/* Divider */}
            <div
              style={{ borderColor: config.colors.color08 }}
              className="border-t"
            />

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
                  }}
                  className="px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Primary Button
                </button>
                <button
                  style={{
                    backgroundColor: config.colors.color02,
                    color: "#ffffff",
                  }}
                  className="px-4 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                >
                  Secondary Button
                </button>
                <button
                  style={{
                    backgroundColor: "transparent",
                    color: config.colors.color01,
                    borderColor: config.colors.color01,
                    borderWidth: "1px",
                    borderStyle: "solid",
                  }}
                  className="px-4 py-2 rounded-md font-medium hover:opacity-80 transition-opacity"
                >
                  Outline Button
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
                  style={{ color: config.colors.color09 }}
                  className="underline hover:opacity-80 transition-opacity"
                >
                  Primary Link - Click to navigate
                </a>
                <br />
                <a
                  href="#"
                  style={{ color: config.colors.color01 }}
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
              <p style={{ color: config.colors.color07, fontSize: "0.75rem" }}>
                This is a card or container element using your background alt color. It&apos;s useful for grouping related content and creating visual hierarchy.
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
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: config.colors.color04,
                    color: config.colors.color06,
                    borderColor: config.colors.color08,
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
                  }}
                />
                <select
                  className="w-full px-3 py-2 rounded-md border"
                  style={{
                    backgroundColor: config.colors.color04,
                    color: config.colors.color06,
                    borderColor: config.colors.color08,
                  }}
                >
                  <option>Select an option</option>
                  <option>Option 1</option>
                  <option>Option 2</option>
                </select>
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
              <ul className="list-disc list-inside space-y-1" style={{ color: config.colors.color06 }}>
                <li>First list item</li>
                <li>Second list item</li>
                <li>Third list item</li>
              </ul>
              <ol className="list-decimal list-inside space-y-1" style={{ color: config.colors.color06 }}>
                <li>Ordered item one</li>
                <li>Ordered item two</li>
                <li>Ordered item three</li>
              </ol>
            </div>

            {/* Badge/Tag Examples */}
            <div className="space-y-2">
              <h4
                style={{
                  fontFamily: `"${config.fonts.primary.family}", sans-serif`,
                  color: config.colors.color06,
                }}
                className="text-base font-semibold"
              >
                Badges & Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: config.colors.color01,
                    color: "#ffffff",
                  }}
                >
                  Primary Badge
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: config.colors.color10,
                    color: "#ffffff",
                  }}
                >
                  Success Badge
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: config.colors.color11,
                    color: "#ffffff",
                  }}
                >
                  Warning Badge
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: config.colors.color12,
                    color: "#ffffff",
                  }}
                >
                  Error Badge
                </span>
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
