"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, ImageIcon, LayoutGrid, List } from "lucide-react";

interface MediaPickerItem {
  id: string;
  name: string;
  uid: string;
  thumbnailUrl: string | null;
}

interface MediaPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mediaId: string) => void;
}

const DEBOUNCE_MS = 300;

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
}: MediaPickerModalProps) {
  const [list, setList] = useState<MediaPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchList = useCallback(async (searchQuery: string) => {
    const url = searchQuery
      ? `/api/shortcodes/media-list?search=${encodeURIComponent(searchQuery)}`
      : "/api/shortcodes/media-list";
    const res = await fetch(url);
    const data = res.ok ? await res.json() : [];
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearchInput("");
    setSearch("");
  }, [open]);

  // Debounce search -> API
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setSearch(searchInput), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, searchInput]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchList(search)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [open, search, fetchList]);

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle>Choose image</DialogTitle>
          <DialogDescription>
            Select an image from the media library. Search by name, UID, or taxonomy/tags.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Input
            type="search"
            placeholder="Search by name, UID, or tags…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
            aria-label="Search media"
          />
          <div className="flex rounded-md border border-input overflow-hidden" role="group" aria-label="View mode">
            <button
              type="button"
              title="Grid view"
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="List view"
              onClick={() => setViewMode("list")}
              className={`p-2 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading…
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search || searchInput
              ? "No media match your search. Try a different term."
              : "No media in the library. Upload images in Media → Library first."}
          </p>
        ) : viewMode === "grid" ? (
          <div
            className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto flex-1 min-h-0 py-1 pr-1"
            style={{ maxHeight: "min(400px, 50vh)" }}
          >
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex flex-col rounded-lg border overflow-hidden hover:border-primary hover:bg-muted/50 transition-colors text-left"
                onClick={() => handleSelect(item.id)}
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs truncate px-2 py-1" title={item.name}>
                  {item.name}
                </p>
                {item.uid && item.uid !== item.name && (
                  <p className="text-xs truncate px-2 pb-1 text-muted-foreground" title={item.uid}>
                    {item.uid}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col overflow-y-auto flex-1 min-h-0 py-1 pr-1 space-y-1"
            style={{ maxHeight: "min(400px, 50vh)" }}
          >
            {list.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex items-center gap-3 w-full rounded-lg border p-2 text-left hover:border-primary hover:bg-muted/50 transition-colors"
                onClick={() => handleSelect(item.id)}
              >
                <div className="w-12 h-12 flex-shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" title={item.name}>
                    {item.name}
                  </p>
                  {item.uid && (
                    <p className="text-xs text-muted-foreground truncate" title={item.uid}>
                      UID: {item.uid}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
