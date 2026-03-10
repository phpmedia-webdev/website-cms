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
import {
  Minus,
  Layout,
  LayoutGrid,
  Space,
  Eraser,
  Image,
  ImagePlus,
  MousePointer,
  FileText,
  FileCode,
  Loader2,
} from "lucide-react";
import type { ShortcodeType } from "@/lib/shortcodes/types";
import { GalleryPickerModal } from "./GalleryPickerModal";
import { MediaPickerModal } from "./MediaPickerModal";
import { LayoutWizardModal } from "./LayoutWizardModal";
import { MEDIA_SIZE_OPTIONS } from "./MediaShortcodeRender";
import { getContentTypes, getContentListWithTypes } from "@/lib/supabase/content";
import type { ContentType, ContentListItem } from "@/types/content";
import type { ButtonStyle } from "@/types/design-system";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ImagePlus,
  Image,
  FileText,
  LayoutGrid,
  Minus,
  Layout,
  Space,
  ClearFormatting: Eraser,
  Eraser,
  MousePointer,
  FileCode,
};

const FIXED_SHORTCODES: Record<string, string> = {
  separator: "[[separator]]",
  section_break: "[[section-break]]",
  spacer: "[[spacer]]",
  clear: "[[clear]]",
};

interface ShortcodePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (shortcode: string) => void;
  /** Exclude this content id from Content picker to prevent self-reference / infinite recursion. */
  excludeContentId?: string | null;
}

export function ShortcodePickerModal({
  open,
  onClose,
  onSelect,
  excludeContentId,
}: ShortcodePickerModalProps) {
  const [types, setTypes] = useState<ShortcodeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [buttonFormOpen, setButtonFormOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonStyles, setButtonStyles] = useState<ButtonStyle[]>([]);
  const [buttonStyleSlug, setButtonStyleSlug] = useState("primary");
  const [pendingMediaId, setPendingMediaId] = useState<string | null>(null);
  const [mediaSize, setMediaSize] = useState<string>("medium");
  const [layoutWizardOpen, setLayoutWizardOpen] = useState(false);
  const [contentPickerOpen, setContentPickerOpen] = useState(false);
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [contentList, setContentList] = useState<ContentListItem[]>([]);
  const [contentPickerStep, setContentPickerStep] = useState<"type" | "item">("type");
  const [contentPickerTypeSlug, setContentPickerTypeSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/shortcodes/types")
      .then((res) => res.json())
      .then((data) => {
        setTypes(data.types ?? []);
      })
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, [open]);

  const handleTypeClick = (t: ShortcodeType) => {
    if (!t.has_picker) {
      const fixed = FIXED_SHORTCODES[t.slug];
      if (fixed) {
        onSelect(fixed);
        onClose();
      }
      return;
    }
    switch (t.picker_type) {
      case "gallery":
        setGalleryPickerOpen(true);
        break;
      case "media":
        setMediaPickerOpen(true);
        break;
      case "content":
        setContentPickerOpen(true);
        setContentPickerStep("type");
        setContentPickerTypeSlug(null);
        getContentTypes()
          .then((list) => setContentTypes(list.filter((x) => x.is_core && x.slug !== "page")))
          .catch(() => setContentTypes([]));
        getContentListWithTypes()
          .then(setContentList)
          .catch(() => setContentList([]));
        break;
      case "button":
        setButtonFormOpen(true);
        fetch("/api/settings/button-styles")
          .then((r) => (r.ok ? r.json() : []))
          .then((list) => setButtonStyles(Array.isArray(list) ? list : []))
          .catch(() => setButtonStyles([]));
        break;
      case "layout":
        setLayoutWizardOpen(true);
        break;
      default:
        break;
    }
  };

  const contentTypesForPicker = contentTypes;
  const contentItemsForPicker =
    contentPickerTypeSlug == null
      ? []
      : contentList.filter(
          (c) => c.type_slug === contentPickerTypeSlug && c.id !== excludeContentId
        );

  const handleContentTypeSelect = (typeSlug: string) => {
    setContentPickerTypeSlug(typeSlug);
    setContentPickerStep("item");
  };

  const handleContentItemSelect = (contentId: string) => {
    const typeSlug = contentPickerTypeSlug ?? "snippet";
    const shortcode =
      typeSlug === "snippet" ? `[[snippet:${contentId}]]` : `[[content:${contentId}]]`;
    onSelect(shortcode);
    setContentPickerOpen(false);
    setContentPickerStep("type");
    setContentPickerTypeSlug(null);
    onClose();
  };

  const handleLayoutSelect = (shortcode: string) => {
    setLayoutWizardOpen(false);
    onSelect(shortcode);
    onClose();
  };

  const handleGallerySelect = (shortcode: string) => {
    setGalleryPickerOpen(false);
    onSelect(shortcode);
    onClose();
  };

  const insertButton = () => {
    const label = buttonLabel.trim() || "Button";
    const url = buttonUrl.trim() || "#";
    const style = buttonStyleSlug.trim() || "primary";
    onSelect(`[[button:${label}|${url}|${style}]]`);
    setButtonFormOpen(false);
    setButtonLabel("");
    setButtonUrl("");
    setButtonStyleSlug("primary");
    onClose();
  };

  const handleMediaSelect = (id: string) => {
    setPendingMediaId(id);
    setMediaPickerOpen(false);
  };

  const insertMediaShortcode = () => {
    if (!pendingMediaId) return;
    onSelect(`[[media:${pendingMediaId}|${mediaSize}]]`);
    setPendingMediaId(null);
    setMediaSize("medium");
    onClose();
  };

  const Icon = (slug: string, iconName: string) => {
    const C = ICON_MAP[iconName] ?? FileCode;
    return <C className="h-4 w-4 shrink-0 text-muted-foreground" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Insert shortcode</DialogTitle>
            <DialogDescription>
              Choose a shortcode type. Some types open a picker to select content.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-0.5">
              {types.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md hover:bg-muted/60"
                  onClick={() => handleTypeClick(t)}
                >
                  {Icon(t.slug, t.icon)}
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <GalleryPickerModal
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onSelect={handleGallerySelect}
      />

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />

      <Dialog open={!!pendingMediaId} onOpenChange={(o) => !o && setPendingMediaId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Image size</DialogTitle>
            <DialogDescription>
              Choose how large the image appears in the content. You can change this later by editing the shortcode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="media-size">Size</Label>
              <select
                id="media-size"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm mt-1"
                value={mediaSize}
                onChange={(e) => setMediaSize(e.target.value)}
              >
                {MEDIA_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingMediaId(null)}>Cancel</Button>
              <Button onClick={insertMediaShortcode}>Insert shortcode</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={buttonFormOpen} onOpenChange={setButtonFormOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert button</DialogTitle>
            <DialogDescription>Label and URL. Theme styles the button.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="btn-label">Label</Label>
              <Input
                id="btn-label"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Button text"
              />
            </div>
            <div>
              <Label htmlFor="btn-url">URL</Label>
              <Input
                id="btn-url"
                type="url"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div>
              <Label htmlFor="btn-style">Style</Label>
              <select
                id="btn-style"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={buttonStyleSlug}
                onChange={(e) => setButtonStyleSlug(e.target.value)}
              >
                {buttonStyles.length === 0 ? (
                  <>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="outline">Outline</option>
                  </>
                ) : (
                  buttonStyles.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setButtonFormOpen(false)}>Cancel</Button>
              <Button onClick={insertButton}>Insert</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={contentPickerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setContentPickerOpen(false);
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
                ? "Select a content type, then pick an item to embed. Current document is excluded to prevent self-reference."
                : `Select a ${contentPickerTypeSlug ?? ""} item.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            {contentPickerStep === "type" ? (
              contentTypesForPicker.length === 0 ? (
                <p className="text-sm text-muted-foreground">No content types available.</p>
              ) : (
                contentTypesForPicker.map((t) => (
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
                {contentItemsForPicker.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No items of this type{excludeContentId ? " (current document excluded)" : ""}.
                  </p>
                ) : (
                  contentItemsForPicker.map((c) => (
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

      <LayoutWizardModal
        open={layoutWizardOpen}
        onClose={() => setLayoutWizardOpen(false)}
        onSelect={handleLayoutSelect}
        excludeContentId={excludeContentId ?? undefined}
      />
    </>
  );
}
