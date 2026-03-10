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
  Space,
  Eraser,
  Image,
  ImagePlus,
  MousePointer,
  FileInput,
  FileCode,
  Loader2,
} from "lucide-react";
import type { ShortcodeType } from "@/lib/shortcodes/types";
import { GalleryPickerModal } from "./GalleryPickerModal";
import { MediaPickerModal } from "./MediaPickerModal";
import { MEDIA_SIZE_OPTIONS } from "./MediaShortcodeRender";
import type { ButtonStyle } from "@/types/design-system";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ImagePlus,
  Image,
  Minus,
  Layout,
  Space,
  ClearFormatting: Eraser,
  Eraser,
  MousePointer,
  FileInput,
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
}

export function ShortcodePickerModal({
  open,
  onClose,
  onSelect,
}: ShortcodePickerModalProps) {
  const [types, setTypes] = useState<ShortcodeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [buttonFormOpen, setButtonFormOpen] = useState(false);
  const [formListOpen, setFormListOpen] = useState(false);
  const [snippetListOpen, setSnippetListOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [buttonStyles, setButtonStyles] = useState<ButtonStyle[]>([]);
  const [buttonStyleSlug, setButtonStyleSlug] = useState("primary");
  const [formId, setFormId] = useState("");
  const [forms, setForms] = useState<{ id: string; name: string }[]>([]);
  const [snippets, setSnippets] = useState<{ id: string; title: string }[]>([]);
  const [snippetId, setSnippetId] = useState("");
  const [pendingMediaId, setPendingMediaId] = useState<string | null>(null);
  const [mediaSize, setMediaSize] = useState<string>("medium");

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
      case "button":
        setButtonFormOpen(true);
        break;
      case "form":
        setFormListOpen(true);
        fetch("/api/crm/forms")
          .then((r) => r.ok ? r.json() : [])
          .then((list) => setForms(Array.isArray(list) ? list.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })) : []))
          .catch(() => setForms([]));
        break;
      case "snippet":
        setSnippetListOpen(true);
        fetch("/api/settings/snippets")
          .then((r) => r.ok ? r.json() : [])
          .then((data) => setSnippets(Array.isArray(data) ? data : []))
          .catch(() => setSnippets([]));
        break;
      default:
        break;
    }
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

  const insertForm = () => {
    if (!formId) return;
    onSelect(`[[form:${formId}]]`);
    setFormListOpen(false);
    setFormId("");
    onClose();
  };

  const insertSnippet = () => {
    if (!snippetId) return;
    onSelect(`[[snippet:${snippetId}]]`);
    setSnippetListOpen(false);
    setSnippetId("");
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

      <Dialog open={formListOpen} onOpenChange={setFormListOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert form</DialogTitle>
            <DialogDescription>Choose a form to embed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {forms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forms. Create one in CRM → Forms.</p>
            ) : (
              forms.map((f) => (
                <Button
                  key={f.id}
                  variant={formId === f.id ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { setFormId(f.id); insertForm(); }}
                >
                  {f.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={snippetListOpen} onOpenChange={setSnippetListOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert snippet</DialogTitle>
            <DialogDescription>Choose a snippet from the content library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {snippets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No snippets. Create content type Snippet in Settings.</p>
            ) : (
              snippets.map((s) => (
                <Button
                  key={s.id}
                  variant={snippetId === s.id ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => { setSnippetId(s.id); insertSnippet(); }}
                >
                  {s.title ?? s.id}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
