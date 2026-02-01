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
import { ChevronDown, ChevronRight, ImageIcon } from "lucide-react";
import { getPublishedGalleries } from "@/lib/supabase/galleries";
import { generateGalleryShortcode } from "@/lib/shortcodes/gallery";
import type { GalleryDisplayStyle } from "@/types/content";

interface GalleryWithStyles {
  id: string;
  name: string;
  slug: string;
  status: string;
  styles: GalleryDisplayStyle[];
}

interface GalleryPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (shortcode: string) => void;
}

export function GalleryPickerModal({
  open,
  onClose,
  onSelect,
}: GalleryPickerModalProps) {
  const [galleries, setGalleries] = useState<GalleryWithStyles[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const list = await getPublishedGalleries();
        const withStyles: GalleryWithStyles[] = await Promise.all(
          list.map(async (g) => {
            let styles: GalleryDisplayStyle[] = [];
            try {
              const res = await fetch(`/api/galleries/${g.id}/styles`);
              if (res.ok) {
                const json = await res.json();
                styles = json.styles ?? [];
              }
            } catch {
              // ignore
            }
            return { ...g, styles };
          })
        );
        setGalleries(withStyles);
        setExpandedId(withStyles[0]?.id ?? null);
      } catch {
        setGalleries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const handleSelect = (galleryId: string, styleId?: string | null) => {
    const shortcode = generateGalleryShortcode(galleryId, styleId);
    onSelect(shortcode);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert gallery</DialogTitle>
          <DialogDescription>
            Choose a gallery and optionally a display style. The shortcode will be inserted at the cursor.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Loading galleries…
          </p>
        ) : galleries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No published galleries yet. Create one in Galleries first.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 space-y-1 border rounded-md divide-y">
            {galleries.map((g) => (
              <div key={g.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/50 rounded-none"
                  onClick={() =>
                    setExpandedId((id) => (id === g.id ? null : g.id))
                  }
                >
                  {expandedId === g.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium truncate">{g.name}</span>
                </button>
                {expandedId === g.id && (
                  <div className="pl-9 pr-3 pb-2 space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start font-normal"
                      onClick={() => handleSelect(g.id, null)}
                    >
                      Default (no style)
                    </Button>
                    {g.styles.map((s) => (
                      <Button
                        key={s.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start font-normal"
                        onClick={() => handleSelect(g.id, s.id)}
                      >
                        {s.name} ({s.layout})
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
