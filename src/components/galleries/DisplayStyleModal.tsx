"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GalleryDisplayStyle } from "@/types/content";

export interface DisplayStyleFormValues {
  name: string;
  layout: "grid" | "masonry" | "slider";
  columns: number;
  gap: "sm" | "md" | "lg";
  size: "thumbnail" | "small" | "medium" | "large" | "original";
  cell_size: "xsmall" | "small" | "medium" | "large" | "xlarge";
  captions: boolean;
  lightbox: boolean;
  border: "none" | "subtle" | "frame";
  sort_order: "as_added" | "name_asc" | "name_desc" | "date_newest" | "date_oldest" | "custom";
  slider_animation: "slide" | "fade";
  slider_autoplay: boolean;
  slider_delay: number;
  slider_controls: "arrows" | "dots" | "both" | "none";
}

const DEFAULT_VALUES: DisplayStyleFormValues = {
  name: "",
  layout: "grid",
  columns: 3,
  gap: "md",
  size: "medium",
  cell_size: "medium",
  captions: true,
  lightbox: true,
  border: "none",
  sort_order: "as_added",
  slider_animation: "slide",
  slider_autoplay: false,
  slider_delay: 5,
  slider_controls: "arrows",
};

const SORT_ORDER_OPTIONS: { value: DisplayStyleFormValues["sort_order"]; label: string }[] = [
  { value: "as_added", label: "As added" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "date_newest", label: "Date (newest first)" },
  { value: "date_oldest", label: "Date (oldest first)" },
  { value: "custom", label: "Custom (drag to arrange in Gallery Items)" },
];

function styleToForm(style: GalleryDisplayStyle): DisplayStyleFormValues {
  const validCellSize = ["xsmall", "small", "medium", "large", "xlarge"].includes(style.cell_size ?? "")
    ? (style.cell_size as DisplayStyleFormValues["cell_size"])
    : "medium";
  const validSort =
    SORT_ORDER_OPTIONS.some((o) => o.value === style.sort_order) && style.sort_order
      ? (style.sort_order as DisplayStyleFormValues["sort_order"])
      : "as_added";
  return {
    name: style.name,
    layout: style.layout,
    columns: style.columns,
    gap: style.gap,
    size: style.size,
    cell_size: validCellSize,
    captions: style.captions,
    lightbox: style.lightbox,
    border: style.border,
    sort_order: validSort,
    slider_animation: (style.slider_animation ?? "slide") as "slide" | "fade",
    slider_autoplay: style.slider_autoplay ?? false,
    slider_delay: style.slider_delay ?? 5,
    slider_controls: (style.slider_controls ?? "arrows") as "arrows" | "dots" | "both" | "none",
  };
}

interface DisplayStyleModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: DisplayStyleFormValues) => Promise<void>;
  galleryId: string;
  style?: GalleryDisplayStyle | null;
}

export function DisplayStyleModal({
  open,
  onClose,
  onSave,
  galleryId,
  style,
}: DisplayStyleModalProps) {
  const [values, setValues] = useState<DisplayStyleFormValues>(DEFAULT_VALUES);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(style?.id);

  useEffect(() => {
    if (open) {
      setValues(style ? styleToForm(style) : { ...DEFAULT_VALUES, name: "" });
    }
  }, [open, style]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } catch {
      // Caller handles error
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Display Style" : "Add Display Style"}</DialogTitle>
          <DialogDescription>
            Saved presets for how this gallery appears. Use in posts via shortcode.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="style-name">Name</Label>
            <Input
              id="style-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Large Grid, Compact Slider"
              required
            />
          </div>

          <div>
            <Label htmlFor="style-layout">Layout</Label>
            <select
              id="style-layout"
              value={values.layout}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  layout: e.target.value as DisplayStyleFormValues["layout"],
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="grid">Grid</option>
              <option value="masonry">Masonry</option>
              <option value="slider">Slider</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="style-columns">Columns (1–6)</Label>
              <Input
                id="style-columns"
                type="number"
                min={1}
                max={6}
                value={values.columns}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    columns: Math.min(6, Math.max(1, parseInt(e.target.value, 10) || 3)),
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="style-gap">Gap</Label>
              <select
                id="style-gap"
                value={values.gap}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    gap: e.target.value as DisplayStyleFormValues["gap"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="style-size">Image size</Label>
              <select
                id="style-size"
                value={values.size}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    size: e.target.value as DisplayStyleFormValues["size"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="thumbnail">Thumbnail</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="original">Original</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Which variant to load</p>
            </div>
            <div>
              <Label htmlFor="style-cell-size">Gallery size</Label>
              <select
                id="style-cell-size"
                value={values.cell_size}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    cell_size: e.target.value as DisplayStyleFormValues["cell_size"],
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="xsmall">XSmall (almost thumbnail)</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xlarge">XLarge</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">Physical display scale</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.captions}
                onChange={(e) =>
                  setValues((v) => ({ ...v, captions: e.target.checked }))
                }
                className="rounded border-input"
              />
              <span className="text-sm">Show captions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.lightbox}
                onChange={(e) =>
                  setValues((v) => ({ ...v, lightbox: e.target.checked }))
                }
                className="rounded border-input"
              />
              <span className="text-sm">Lightbox</span>
            </label>
          </div>

          <div>
            <Label htmlFor="style-border">Border</Label>
            <select
              id="style-border"
              value={values.border}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  border: e.target.value as DisplayStyleFormValues["border"],
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="none">None</option>
              <option value="subtle">Subtle</option>
              <option value="frame">Frame</option>
            </select>
          </div>

          <div>
            <Label htmlFor="style-sort-order">Sort order</Label>
            <select
              id="style-sort-order"
              value={values.sort_order}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  sort_order: e.target.value as DisplayStyleFormValues["sort_order"],
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {SORT_ORDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Custom order is set by dragging items on the Gallery Items card.
            </p>
          </div>

          {values.layout === "slider" && (
            <div className="space-y-4 border-t pt-4">
              <p className="text-sm font-medium">Slider options</p>
              <div>
                <Label htmlFor="slider-animation">Animation</Label>
                <select
                  id="slider-animation"
                  value={values.slider_animation}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      slider_animation: e.target.value as "slide" | "fade",
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                </select>
              </div>
              <div>
                <Label htmlFor="slider-controls">Controls</Label>
                <select
                  id="slider-controls"
                  value={values.slider_controls}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      slider_controls: e.target.value as DisplayStyleFormValues["slider_controls"],
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="arrows">Arrows</option>
                  <option value="dots">Dots</option>
                  <option value="both">Both</option>
                  <option value="none">None</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.slider_autoplay}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, slider_autoplay: e.target.checked }))
                  }
                  className="rounded border-input"
                />
                <span className="text-sm">Autoplay</span>
              </label>
              {values.slider_autoplay && (
                <div>
                  <Label htmlFor="slider-delay">Delay (seconds)</Label>
                  <Input
                    id="slider-delay"
                    type="number"
                    min={1}
                    max={30}
                    value={values.slider_delay}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        slider_delay: Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 5)),
                      }))
                    }
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !values.name.trim()}>
              {saving ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
