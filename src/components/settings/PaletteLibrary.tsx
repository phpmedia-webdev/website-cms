"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ColorPaletteEntry, ColorPalettePayload } from "@/types/color-palette";
import type { ColorPalette } from "@/types/design-system";
import { Search, Save, Trash2, Palette as PaletteIcon, Sparkles, X } from "lucide-react";

interface PaletteLibraryProps {
  currentColors: ColorPalette;
  onPaletteSelect: (colors: ColorPalette) => void;
  showSaveDialog?: boolean;
  onSaveDialogChange?: (show: boolean) => void;
}

export function PaletteLibrary({ 
  currentColors, 
  onPaletteSelect, 
  showSaveDialog: externalShowSaveDialog,
  onSaveDialogChange 
}: PaletteLibraryProps) {
  const [palettes, setPalettes] = useState<ColorPaletteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [internalShowSaveDialog, setInternalShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedPalette, setSelectedPalette] = useState<ColorPaletteEntry | null>(null);

  // Color palette groups
  const PALETTE_GROUPS = [
    { value: "all", label: "All Palettes" },
    { value: "professional", label: "Professional & Corporate" },
    { value: "material-design", label: "Material Design" },
    { value: "tailwind", label: "Tailwind Defaults" },
    { value: "pastels", label: "Pastels & Soft" },
    { value: "cool-tones", label: "Cool Tones" },
    { value: "warm-tones", label: "Warm Tones" },
    { value: "custom", label: "Custom" },
  ];

  // Use external state if provided, otherwise use internal state
  const showSaveDialog = externalShowSaveDialog !== undefined ? externalShowSaveDialog : internalShowSaveDialog;
  const setShowSaveDialog = (show: boolean) => {
    if (onSaveDialogChange) {
      onSaveDialogChange(show);
    } else {
      setInternalShowSaveDialog(show);
    }
  };

  useEffect(() => {
    loadPalettes();
  }, [filter]);

  const loadPalettes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/color-palettes");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to load palettes:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Failed to load palettes: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      setPalettes(data.palettes || []);
    } catch (error) {
      console.error("Error loading palettes:", error);
      alert("Failed to load palettes. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaletteModal = (palette: ColorPaletteEntry) => {
    setSelectedPalette(palette);
  };

  // Fill palette to 15 colors by creating variations of existing colors
  const fillPaletteTo15 = (palette: ColorPalette): ColorPalette => {
    const filled = { ...palette };
    const colorKeys: (keyof ColorPalette)[] = [
      "color01", "color02", "color03", "color04", "color05",
      "color06", "color07", "color08", "color09", "color10",
      "color11", "color12", "color13", "color14", "color15",
    ];

    // Find which colors are missing
    const missingKeys: (keyof ColorPalette)[] = colorKeys.filter(
      (key) => !filled[key] || filled[key] === ""
    );

    if (missingKeys.length === 0) return filled; // Already has 15 colors

    // Get existing colors (first 9 are typically core colors)
    const existingColors = colorKeys
      .slice(0, 9)
      .map((key) => filled[key])
      .filter((color) => color && color !== "");

    if (existingColors.length === 0) {
      // No colors to work with, use defaults
      const { DEFAULT_DESIGN_SYSTEM } = require("@/types/design-system");
      return DEFAULT_DESIGN_SYSTEM.colors;
    }

    // Helper to adjust color brightness
    const adjustColor = (hex: string, percent: number, lighter: boolean): string => {
      const cleanHex = hex.replace("#", "");
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);

      const adjust = (val: number) => {
        if (lighter) {
          return Math.min(255, val + (255 - val) * percent / 100);
        } else {
          return Math.max(0, val - val * percent / 100);
        }
      };

      const newR = Math.round(adjust(r));
      const newG = Math.round(adjust(g));
      const newB = Math.round(adjust(b));

      return `#${newR.toString(16).padStart(2, "0")}${newG.toString(16).padStart(2, "0")}${newB.toString(16).padStart(2, "0")}`;
    };

    // Fill missing colors with variations
    missingKeys.forEach((key, index) => {
      const sourceColor = existingColors[index % existingColors.length];
      if (!sourceColor) return;

      // Create variations: lighter for even indices, darker for odd
      const isEven = index % 2 === 0;
      const variationPercent = isEven ? 20 : 25; // Lighter or darker percentage

      filled[key] = adjustColor(sourceColor, variationPercent, isEven);
    });

    return filled;
  };

  const handleApplyPalette = () => {
    if (selectedPalette) {
      // Fill palette to 15 colors if needed
      const filledPalette = fillPaletteTo15(selectedPalette.colors);
      onPaletteSelect(filledPalette);
      setSelectedPalette(null);
    }
  };

  const handleSavePalette = async () => {
    if (!saveName.trim()) {
      alert("Please enter a palette name");
      return;
    }

    try {
      // Import default colors to ensure all properties are present
      const { DEFAULT_DESIGN_SYSTEM } = await import("@/types/design-system");
      
      // Merge current colors with defaults to ensure all 15 colors are present
      // This prevents null/undefined values from being saved
      const completeColors: ColorPalette = {
        ...DEFAULT_DESIGN_SYSTEM.colors,
        ...currentColors,
        // Explicitly ensure all color01-color15 are set (use current or default)
        color01: currentColors.color01 || DEFAULT_DESIGN_SYSTEM.colors.color01,
        color02: currentColors.color02 || DEFAULT_DESIGN_SYSTEM.colors.color02,
        color03: currentColors.color03 || DEFAULT_DESIGN_SYSTEM.colors.color03,
        color04: currentColors.color04 || DEFAULT_DESIGN_SYSTEM.colors.color04,
        color05: currentColors.color05 || DEFAULT_DESIGN_SYSTEM.colors.color05,
        color06: currentColors.color06 || DEFAULT_DESIGN_SYSTEM.colors.color06,
        color07: currentColors.color07 || DEFAULT_DESIGN_SYSTEM.colors.color07,
        color08: currentColors.color08 || DEFAULT_DESIGN_SYSTEM.colors.color08,
        color09: currentColors.color09 || DEFAULT_DESIGN_SYSTEM.colors.color09,
        color10: currentColors.color10 || DEFAULT_DESIGN_SYSTEM.colors.color10,
        color11: currentColors.color11 || DEFAULT_DESIGN_SYSTEM.colors.color11,
        color12: currentColors.color12 || DEFAULT_DESIGN_SYSTEM.colors.color12,
        color13: currentColors.color13 || DEFAULT_DESIGN_SYSTEM.colors.color13,
        color14: currentColors.color14 || DEFAULT_DESIGN_SYSTEM.colors.color14,
        color15: currentColors.color15 || DEFAULT_DESIGN_SYSTEM.colors.color15,
      };
      
      const response = await fetch("/api/admin/color-palettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName,
          description: saveDescription || null,
          colors: completeColors,
          tags: [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to save palette:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || `Failed to save palette: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
      await loadPalettes();
      alert("Palette saved successfully!");
    } catch (error: any) {
      console.error("Error saving palette:", error);
      alert(`Failed to save palette: ${error.message || "Please try again."}`);
    }
  };

  const handleDeletePalette = async (id: string) => {
    if (!confirm("Are you sure you want to delete this palette?")) return;

    try {
      const response = await fetch(`/api/admin/color-palettes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to delete palette:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(errorData.error || `Failed to delete palette: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      loadPalettes();
      alert("Palette deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting palette:", error);
      alert(`Failed to delete palette: ${error.message || "Please try again."}`);
    }
  };

  const filteredPalettes = palettes.filter((palette) => {
    // Filter by group
    if (filter === "custom") {
      if (palette.is_predefined) return false;
    } else if (filter !== "all") {
      // Filter by group tag
      if (!palette.is_predefined || !palette.tags.includes(filter)) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        palette.name.toLowerCase().includes(query) ||
        (palette.description && palette.description.toLowerCase().includes(query)) ||
        palette.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    return true;
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <PaletteIcon className="h-4 w-4" />
          Palette Library
        </CardTitle>
        <CardDescription className="text-xs mt-0.5">
          Browse predefined palettes or save your custom color combinations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search palettes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {PALETTE_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Save Current Palette</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="palette-name">Palette Name *</Label>
                <Input
                  id="palette-name"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="My Custom Palette"
                />
              </div>
              <div>
                <Label htmlFor="palette-description">Description (optional)</Label>
                <Input
                  id="palette-description"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="A description of this palette"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSavePalette} size="sm">
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveName("");
                    setSaveDescription("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Palette Grid */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading palettes...</div>
        ) : filteredPalettes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No palettes found matching your search." : "No palettes available."}
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto pr-2">
            {(() => {
              // If "all" is selected, group by category; otherwise show flat list
              if (filter === "all") {
                // Group palettes by their primary group tag
                const groupedPalettes: Record<string, ColorPaletteEntry[]> = {};
                
                filteredPalettes.forEach((palette) => {
                  if (palette.is_predefined) {
                    // Find the primary group tag
                    const groupTag = PALETTE_GROUPS.find(
                      (g) => g.value !== "all" && g.value !== "custom" && palette.tags.includes(g.value)
                    )?.value || "other";
                    
                    if (!groupedPalettes[groupTag]) {
                      groupedPalettes[groupTag] = [];
                    }
                    groupedPalettes[groupTag].push(palette);
                  } else {
                    // Custom palettes
                    if (!groupedPalettes["custom"]) {
                      groupedPalettes["custom"] = [];
                    }
                    groupedPalettes["custom"].push(palette);
                  }
                });

                return (
                  <div className="space-y-6">
                    {Object.entries(groupedPalettes).map(([groupKey, groupPalettes]) => {
                      const groupInfo = PALETTE_GROUPS.find((g) => g.value === groupKey);
                      const groupLabel = groupInfo?.label || "Other";
                      const maxVisible = 10; // 2 rows × 5 columns
                      const hasMore = groupPalettes.length > maxVisible;

                      return (
                        <div key={groupKey} className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">{groupLabel}</h3>
                          <div className="grid grid-cols-5 gap-3">
                            {groupPalettes.map((palette) => (
                          <Card
                            key={palette.id}
                            className="relative group cursor-pointer hover:border-primary transition-colors"
                            onClick={() => handleOpenPaletteModal(palette)}
                          >
                            <CardHeader className="pb-2 px-3 pt-3">
                              <div className="flex items-start justify-between gap-1">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-xs font-semibold truncate" title={palette.name}>
                                    {palette.name}
                                  </CardTitle>
                                  {palette.is_predefined && (
                                    <Sparkles className="h-3 w-3 text-muted-foreground mt-1" />
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                              {/* Color Preview - Compact 5 color swatches */}
                              <div className="grid grid-cols-5 gap-0.5 mb-2">
                                {[
                                  palette.colors.color01,
                                  palette.colors.color02,
                                  palette.colors.color03,
                                  palette.colors.color04,
                                  palette.colors.color05,
                                ].map((color, idx) => {
                                  const displayColor = color || "#000000";
                                  const colorLabel = color || "undefined";
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className="aspect-square rounded-sm border border-border/50"
                                      style={{ backgroundColor: displayColor }}
                                      title={colorLabel}
                                    />
                                  );
                                })}
                              </div>
                              {!palette.is_predefined && (
                                <div className="flex items-center justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePalette(palette.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                            ))}
                          </div>
                          {hasMore && (
                            <div className="text-xs text-muted-foreground text-center mt-2">
                              Showing first {maxVisible} of {groupPalettes.length} palettes
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              } else {
                // Show flat list when a specific group is selected
                return (
                  <div className="grid grid-cols-5 gap-3">
                    {filteredPalettes.map((palette) => (
                      <Card
                        key={palette.id}
                        className="relative group cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleOpenPaletteModal(palette)}
                      >
                        <CardHeader className="pb-2 px-3 pt-3">
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-xs font-semibold truncate" title={palette.name}>
                                {palette.name}
                              </CardTitle>
                              {palette.is_predefined && (
                                <Sparkles className="h-3 w-3 text-muted-foreground mt-1" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-3">
                          {/* Color Preview - Compact 5 color swatches */}
                          <div className="grid grid-cols-5 gap-0.5 mb-2">
                            {[
                              palette.colors.color01,
                              palette.colors.color02,
                              palette.colors.color03,
                              palette.colors.color04,
                              palette.colors.color05,
                            ].map((color, idx) => {
                              const displayColor = color || "#000000";
                              const colorLabel = color || "undefined";
                              
                              return (
                                <div
                                  key={idx}
                                  className="aspect-square rounded-sm border border-border/50"
                                  style={{ backgroundColor: displayColor }}
                                  title={colorLabel}
                                />
                              );
                            })}
                          </div>
                          {!palette.is_predefined && (
                            <div className="flex items-center justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePalette(palette.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                );
              }
            })()}
          </div>
        )}

        {/* Palette Preview Modal */}
        {selectedPalette && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>{selectedPalette.name}</CardTitle>
                    {selectedPalette.is_predefined && (
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPalette(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {selectedPalette.description && (
                  <CardDescription>{selectedPalette.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* All 15 Colors Grid */}
                <div>
                  <Label className="text-sm font-semibold mb-3 block">All Colors (15)</Label>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { key: "color01", label: "Color 1" },
                      { key: "color02", label: "Color 2" },
                      { key: "color03", label: "Color 3" },
                      { key: "color04", label: "Color 4" },
                      { key: "color05", label: "Color 5" },
                      { key: "color06", label: "Color 6" },
                      { key: "color07", label: "Color 7" },
                      { key: "color08", label: "Color 8" },
                      { key: "color09", label: "Color 9" },
                      { key: "color10", label: "Color 10" },
                      { key: "color11", label: "Color 11" },
                      { key: "color12", label: "Color 12" },
                      { key: "color13", label: "Color 13" },
                      { key: "color14", label: "Color 14" },
                      { key: "color15", label: "Color 15" },
                    ].map(({ key, label }) => {
                      const color = selectedPalette.colors[key as keyof ColorPalette];
                      const displayColor = color || "#000000";
                      
                      return (
                        <div key={key} className="flex flex-col">
                          <Label className="text-xs mb-1">{label}</Label>
                          <div
                            className="w-full aspect-square rounded-lg border-2 border-border"
                            style={{ backgroundColor: displayColor }}
                            title={displayColor}
                          />
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                            {displayColor}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                {selectedPalette.tags && selectedPalette.tags.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedPalette.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-muted rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Button */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedPalette(null)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApplyPalette}>
                    Apply Palette
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
