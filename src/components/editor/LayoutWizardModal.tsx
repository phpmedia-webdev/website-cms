"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, AlertCircle } from "lucide-react";
import { MediaPickerModal } from "./MediaPickerModal";
import { GalleryPickerModal } from "./GalleryPickerModal";
import { getContentTypes, getContentListWithTypes } from "@/lib/supabase/content";
import type { ContentType, ContentListItem } from "@/types/content";
import type { FormStyle } from "@/types/design-system";

export type LayoutColumnContentType = "blank" | "image" | "gallery" | "content" | "form";

export interface LayoutColumnContent {
  type: LayoutColumnContentType;
  shortcode?: string;
}

interface LayoutWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (shortcode: string) => void;
  /** Exclude this content id from Content picker to prevent self-reference / infinite recursion. */
  excludeContentId?: string;
}

function parseWidths(str: string): number[] {
  return str
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
}

function widthsSumTo100(widths: number[]): boolean {
  const sum = widths.reduce((a, b) => a + b, 0);
  return sum === 100;
}

const DEFAULT_HEIGHT = 150;

/** Presets: [widths string, array of % for bar visual]. */
const WIDTH_PRESETS: { value: string; pcts: number[] }[] = [
  { value: "50,50", pcts: [50, 50] },
  { value: "33,34,33", pcts: [33, 34, 33] },
  { value: "30,40,30", pcts: [30, 40, 30] },
  { value: "40,30,30", pcts: [40, 30, 30] },
  { value: "30,30,40", pcts: [30, 30, 40] },
  { value: "25,25,25,25", pcts: [25, 25, 25, 25] },
];

/** Column-layout icon: vertical bars (|) with spacing = column width. e.g. | | | = equal, |  | | = big left. */
function WidthPresetButton({
  value,
  pcts,
  isSelected,
  onSelect,
}: {
  value: string;
  pcts: number[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col items-stretch gap-1.5 rounded-md border px-2 py-1.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
        isSelected
          ? "border-primary bg-primary/10"
          : "border-border hover:bg-muted/60"
      }`}
      title={`Set to ${value}`}
    >
      <div className="flex h-4 w-full items-stretch overflow-hidden rounded-sm border border-border/80 bg-muted/30">
        {pcts.map((p, i) => (
          <div
            key={i}
            className="shrink-0 border-r border-border last:border-r-0"
            style={{ width: `${p}%` }}
          />
        ))}
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value}</span>
    </button>
  );
}

export function LayoutWizardModal({ open, onClose, onSelect, excludeContentId }: LayoutWizardModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [widthsStr, setWidthsStr] = useState("50,50");
  const [heightPx, setHeightPx] = useState(DEFAULT_HEIGHT);
  const [widthsError, setWidthsError] = useState<string | null>(null);
  const [columnContents, setColumnContents] = useState<LayoutColumnContent[]>([]);
  const [mediaPickerForColumn, setMediaPickerForColumn] = useState<number | null>(null);
  const [galleryPickerForColumn, setGalleryPickerForColumn] = useState<number | null>(null);
  const [contentPickerForColumn, setContentPickerForColumn] = useState<number | null>(null);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [contentList, setContentList] = useState<ContentListItem[]>([]);
  const [contentPickerStep, setContentPickerStep] = useState<"type" | "item">("type");
  const [contentPickerTypeSlug, setContentPickerTypeSlug] = useState<string | null>(null);
  const [formPickerForColumn, setFormPickerForColumn] = useState<number | null>(null);
  const [formList, setFormList] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [formStyles, setFormStyles] = useState<FormStyle[]>([]);
  const [formPickerFormId, setFormPickerFormId] = useState<string | null>(null);
  const [formPickerStyleSlug, setFormPickerStyleSlug] = useState<string>("");

  const widths = parseWidths(widthsStr);
  const columnCount = widths.length;
  const validWidths = columnCount > 0 && widthsSumTo100(widths);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setWidthsStr("50,50");
      setHeightPx(DEFAULT_HEIGHT);
      setWidthsError(null);
      setColumnContents([]);
      setMediaPickerForColumn(null);
      setGalleryPickerForColumn(null);
      setContentPickerForColumn(null);
      setContentPickerStep("type");
      setContentPickerTypeSlug(null);
      setFormPickerForColumn(null);
      setFormPickerFormId(null);
      setFormPickerStyleSlug("");
    }
  }, [open]);

  useEffect(() => {
    if (open && step === 2 && columnContents.length !== columnCount) {
      setColumnContents((prev) => {
        const next: LayoutColumnContent[] = [];
        for (let i = 0; i < columnCount; i++) {
          next.push(prev[i] ?? { type: "blank" });
        }
        return next.slice(0, columnCount);
      });
    }
  }, [open, step, columnCount, columnContents.length]);

  const handleStep1Next = () => {
    if (columnCount === 0) {
      setWidthsError("Enter comma-separated percentages (e.g. 50,50 or 30,40,30).");
      return;
    }
    if (!widthsSumTo100(widths)) {
      setWidthsError(`Percentages must total 100 (current: ${widths.reduce((a, b) => a + b, 0)}).`);
      return;
    }
    setWidthsError(null);
    setStep(2);
  };

  const handleColumnTypeChange = (index: number, type: LayoutColumnContentType) => {
    setColumnContents((prev) => {
      const next = [...prev];
      next[index] = { type };
      return next;
    });
    if (type === "image") {
      setMediaPickerForColumn(index);
    } else if (type === "gallery") {
      setGalleryPickerForColumn(index);
    } else if (type === "content") {
      setContentPickerForColumn(index);
      setContentPickerStep("type");
      setContentPickerTypeSlug(null);
      getContentTypes().then((types) => {
        setContentTypes(types);
      }).catch(() => setContentTypes([]));
      getContentListWithTypes().then(setContentList).catch(() => setContentList([]));
    } else if (type === "form") {
      setFormPickerForColumn(index);
      setFormPickerFormId(null);
      setFormPickerStyleSlug("");
      Promise.all([
        fetch("/api/crm/forms").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/settings/form-styles").then((r) => (r.ok ? r.json() : [])),
      ]).then(([forms, styles]) => {
        setFormList(Array.isArray(forms) ? forms : []);
        setFormStyles(Array.isArray(styles) ? styles : []);
      });
    }
  };

  const handleMediaSelect = (mediaId: string) => {
    if (mediaPickerForColumn === null) return;
    const shortcode = `[[media:${mediaId}|medium]]`;
    setColumnContents((prev) => {
      const next = [...prev];
      next[mediaPickerForColumn] = { type: "image", shortcode };
      return next;
    });
    setMediaPickerForColumn(null);
  };

  const handleGallerySelect = (shortcode: string) => {
    if (galleryPickerForColumn === null) return;
    setColumnContents((prev) => {
      const next = [...prev];
      next[galleryPickerForColumn] = { type: "gallery", shortcode };
      return next;
    });
    setGalleryPickerForColumn(null);
  };

  const handleContentTypeSelect = (typeSlug: string) => {
    setContentPickerTypeSlug(typeSlug);
    setContentPickerStep("item");
  };

  const handleContentItemSelect = (contentId: string) => {
    if (contentPickerForColumn === null || !contentPickerTypeSlug) return;
    const shortcode =
      contentPickerTypeSlug === "snippet"
        ? `[[snippet:${contentId}]]`
        : `[[content:${contentId}]]`;
    setColumnContents((prev) => {
      const next = [...prev];
      next[contentPickerForColumn] = { type: "content", shortcode };
      return next;
    });
    setContentPickerForColumn(null);
    setContentPickerStep("type");
    setContentPickerTypeSlug(null);
  };

  const handleFormSelect = () => {
    if (formPickerForColumn === null || !formPickerFormId) return;
    const stylePart = formPickerStyleSlug.trim() ? `|style=${formPickerStyleSlug.trim()}` : "";
    const shortcode = `[[form:${formPickerFormId}${stylePart}]]`;
    setColumnContents((prev) => {
      const next = [...prev];
      next[formPickerForColumn] = { type: "form", shortcode };
      return next;
    });
    setFormPickerForColumn(null);
    setFormPickerFormId(null);
    setFormPickerStyleSlug("");
  };

  /** Core content types (system has parse/render routines for Content shortcode). */
  const contentTypesForLibrary = contentTypes.filter((t) => t.is_core);
  const contentItemsForType =
    contentPickerTypeSlug == null
      ? []
      : contentList.filter(
          (c) => c.type_slug === contentPickerTypeSlug && c.id !== excludeContentId
        );

  /** Column delimiter for composite layout shortcode (single [[layout|...]] for parser). */
  const COL_DELIM = "{{COL}}";

  const buildShortcode = (): string => {
    const colBodies = widths.map((_, i) => {
      const content = columnContents[i];
      return content?.type !== "blank" && content?.shortcode ? content.shortcode : "";
    });
    return `[[layout|${widthsStr}|${heightPx}|${colBodies.join(COL_DELIM)}]]`;
  };

  const handleInsert = () => {
    onSelect(buildShortcode());
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Layout</DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Define a single row of columns by width percentages and row height."
                : `Assign content to each of the ${columnCount} columns (left to right).`}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="layout-widths">Column widths (%)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {WIDTH_PRESETS.map((preset) => (
                    <WidthPresetButton
                      key={preset.value}
                      value={preset.value}
                      pcts={preset.pcts}
                      isSelected={widthsStr === preset.value}
                      onSelect={() => {
                        setWidthsStr(preset.value);
                        setWidthsError(null);
                      }}
                    />
                  ))}
                </div>
                <Input
                  id="layout-widths"
                  value={widthsStr}
                  onChange={(e) => {
                    setWidthsStr(e.target.value);
                    setWidthsError(null);
                  }}
                  placeholder="50,50 or 30,40,30"
                />
                {widthsError && (
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {widthsError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Choose a preset or edit the field to fine-tune. Percentages must total 100.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="layout-height">Row height (px)</Label>
                <Input
                  id="layout-height"
                  type="number"
                  min={50}
                  max={800}
                  value={heightPx}
                  onChange={(e) => setHeightPx(parseInt(e.target.value, 10) || DEFAULT_HEIGHT)}
                />
              </div>
              <div className="flex flex-col items-end gap-1 pt-2">
                {!validWidths && (
                  <p className="text-xs text-destructive mr-0">check column totals</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleStep1Next} disabled={!validWidths}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 py-2">
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {Array.from({ length: columnCount }, (_, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-border/60 bg-muted/20"
                  >
                    <span className="text-sm font-medium w-16 shrink-0">Column {i + 1}</span>
                    <select
                      className="flex h-9 min-w-[120px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={columnContents[i]?.type ?? "blank"}
                      onChange={(e) =>
                        handleColumnTypeChange(i, e.target.value as LayoutColumnContentType)
                      }
                    >
                      <option value="blank">Blank</option>
                      <option value="image">Image</option>
                      <option value="gallery">Gallery</option>
                      <option value="content">Content</option>
                      <option value="form">Form</option>
                    </select>
                    {columnContents[i]?.type === "image" && !columnContents[i]?.shortcode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMediaPickerForColumn(i)}
                      >
                        Select image
                      </Button>
                    )}
                    {columnContents[i]?.type === "gallery" && !columnContents[i]?.shortcode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setGalleryPickerForColumn(i)}
                      >
                        Select gallery
                      </Button>
                    )}
                    {columnContents[i]?.type === "content" && !columnContents[i]?.shortcode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setContentPickerForColumn(i);
                          setContentPickerStep("type");
                          setContentPickerTypeSlug(null);
                          getContentTypes().then((types) => {
                            setContentTypes(types);
                          }).catch(() => setContentTypes([]));
                          getContentListWithTypes().then(setContentList).catch(() => setContentList([]));
                        }}
                      >
                        Select content
                      </Button>
                    )}
                    {columnContents[i]?.type === "form" && !columnContents[i]?.shortcode && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormPickerForColumn(i);
                          setFormPickerFormId(null);
                          setFormPickerStyleSlug("");
                          Promise.all([
                            fetch("/api/crm/forms").then((r) => (r.ok ? r.json() : [])),
                            fetch("/api/settings/form-styles").then((r) => (r.ok ? r.json() : [])),
                          ]).then(([forms, styles]) => {
                            setFormList(Array.isArray(forms) ? forms : []);
                            setFormStyles(Array.isArray(styles) ? styles : []);
                          });
                        }}
                      >
                        Select form
                      </Button>
                    )}
                    {columnContents[i]?.shortcode && (
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {columnContents[i].shortcode}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={handleInsert}>Insert layout</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MediaPickerModal
        open={mediaPickerForColumn !== null}
        onClose={() => setMediaPickerForColumn(null)}
        onSelect={handleMediaSelect}
      />

      <GalleryPickerModal
        open={galleryPickerForColumn !== null}
        onClose={() => setGalleryPickerForColumn(null)}
        onSelect={handleGallerySelect}
      />

      <Dialog
        open={formPickerForColumn !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFormPickerForColumn(null);
            setFormPickerFormId(null);
            setFormPickerStyleSlug("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select form</DialogTitle>
            <DialogDescription>
              Choose a form to embed in this column. Optionally pick a form style.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Form</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm mt-1"
                value={formPickerFormId ?? ""}
                onChange={(e) => setFormPickerFormId(e.target.value || null)}
              >
                <option value="">Select a form…</option>
                {formList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Form style (optional)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm mt-1"
                value={formPickerStyleSlug}
                onChange={(e) => setFormPickerStyleSlug(e.target.value)}
              >
                <option value="">Default</option>
                {formStyles.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormPickerForColumn(null)}>Cancel</Button>
              <Button onClick={handleFormSelect} disabled={!formPickerFormId}>Insert form</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contentPickerForColumn !== null}
        onOpenChange={(open) => {
          if (!open) {
            setContentPickerForColumn(null);
            setContentPickerStep("type");
            setContentPickerTypeSlug(null);
          }
        }}
      >
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {contentPickerStep === "type" ? "Choose content type" : "Choose content"}
            </DialogTitle>
            <DialogDescription>
              {contentPickerStep === "type"
                ? "Select a content type, then pick an item to embed in the layout cell."
                : `Select a ${contentPickerTypeSlug ?? ""} item.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            {contentPickerStep === "type" ? (
              contentTypesForLibrary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No content types available.</p>
              ) : (
                contentTypesForLibrary.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleContentTypeSelect(t.slug)}
                  >
                    {t.label}
                  </Button>
                ))
              )
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2"
                  onClick={() => {
                    setContentPickerStep("type");
                    setContentPickerTypeSlug(null);
                  }}
                >
                  Back
                </Button>
                {contentItemsForType.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items of this type.</p>
                ) : (
                  contentItemsForType.map((c) => (
                    <Button
                      key={c.id}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleContentItemSelect(c.id)}
                    >
                      {c.title ?? c.slug ?? c.id}
                    </Button>
                  ))
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
