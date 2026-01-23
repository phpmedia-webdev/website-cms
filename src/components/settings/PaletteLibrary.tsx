"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { ColorPaletteEntry, ColorPalettePayload } from "@/types/color-palette";
import type { ColorPalette } from "@/types/design-system";
import { Search, Save, Trash2, Palette as PaletteIcon, Sparkles } from "lucide-react";

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
  const [filter, setFilter] = useState<"all" | "predefined" | "custom">("all");

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

  const handleApplyPalette = (palette: ColorPaletteEntry) => {
    onPaletteSelect(palette.colors);
  };

  const handleSavePalette = async () => {
    if (!saveName.trim()) {
      alert("Please enter a palette name");
      return;
    }

    try {
      // Import default colors to ensure all properties are present
      const { DEFAULT_DESIGN_SYSTEM } = await import("@/types/design-system");
      
      // Merge current colors with defaults to ensure all alternate colors are present
      // This prevents null/undefined values from being saved
      const completeColors: ColorPalette = {
        ...DEFAULT_DESIGN_SYSTEM.colors,
        ...currentColors,
        // Explicitly ensure alternate colors are set (use current or default)
        alternate1: currentColors.alternate1 || DEFAULT_DESIGN_SYSTEM.colors.alternate1,
        alternate2: currentColors.alternate2 || DEFAULT_DESIGN_SYSTEM.colors.alternate2,
        alternate3: currentColors.alternate3 || DEFAULT_DESIGN_SYSTEM.colors.alternate3,
        alternate4: currentColors.alternate4 || DEFAULT_DESIGN_SYSTEM.colors.alternate4,
        alternate5: currentColors.alternate5 || DEFAULT_DESIGN_SYSTEM.colors.alternate5,
        alternate6: currentColors.alternate6 || DEFAULT_DESIGN_SYSTEM.colors.alternate6,
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
    if (filter === "predefined" && !palette.is_predefined) return false;
    if (filter === "custom" && palette.is_predefined) return false;
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaletteIcon className="h-5 w-5" />
          Palette Library
        </CardTitle>
        <CardDescription>
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
              onChange={(e) => setFilter(e.target.value as "all" | "predefined" | "custom")}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Palettes</option>
              <option value="predefined">Predefined</option>
              <option value="custom">Custom</option>
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
            <div className="grid grid-cols-5 gap-3">
              {filteredPalettes.map((palette) => (
                <Card
                  key={palette.id}
                  className="relative group cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleApplyPalette(palette)}
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
                        palette.colors.primary,
                        palette.colors.secondary,
                        palette.colors.accent,
                        palette.colors.alternate1,
                        palette.colors.alternate2,
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
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyPalette(palette);
                        }}
                      >
                        Apply
                      </Button>
                      {!palette.is_predefined && (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
