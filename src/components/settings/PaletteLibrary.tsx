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
}

export function PaletteLibrary({ currentColors, onPaletteSelect }: PaletteLibraryProps) {
  const [palettes, setPalettes] = useState<ColorPaletteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [filter, setFilter] = useState<"all" | "predefined" | "custom">("all");

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
      const response = await fetch("/api/admin/color-palettes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName,
          description: saveDescription || null,
          colors: currentColors,
          tags: [],
        }),
      });

      if (!response.ok) throw new Error("Failed to save palette");

      setShowSaveDialog(false);
      setSaveName("");
      setSaveDescription("");
      loadPalettes();
      alert("Palette saved successfully!");
    } catch (error) {
      console.error("Error saving palette:", error);
      alert("Failed to save palette. Please try again.");
    }
  };

  const handleDeletePalette = async (id: string) => {
    if (!confirm("Are you sure you want to delete this palette?")) return;

    try {
      const response = await fetch(`/api/admin/color-palettes/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete palette");

      loadPalettes();
      alert("Palette deleted successfully!");
    } catch (error) {
      console.error("Error deleting palette:", error);
      alert("Failed to delete palette. Please try again.");
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
        <div className="flex flex-col sm:flex-row gap-4">
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
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "predefined" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("predefined")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Predefined
            </Button>
            <Button
              variant={filter === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("custom")}
            >
              Custom
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Current
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPalettes.map((palette) => (
              <Card
                key={palette.id}
                className="relative group cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleApplyPalette(palette)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold">{palette.name}</CardTitle>
                      {palette.description && (
                        <CardDescription className="text-xs mt-1">
                          {palette.description}
                        </CardDescription>
                      )}
                    </div>
                    {palette.is_predefined && (
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Color Preview */}
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {Object.values(palette.colors).slice(0, 5).map((color, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded border"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Button size="sm" variant="outline" className="flex-1 mr-2">
                      Apply
                    </Button>
                    {!palette.is_predefined && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePalette(palette.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
