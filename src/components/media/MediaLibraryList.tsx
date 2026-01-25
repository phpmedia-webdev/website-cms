"use client";

import { useState } from "react";
import { Trash2, Loader2, Eye, Checkbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox as CheckboxComponent } from "@/components/ui/checkbox";
import { MediaWithVariants } from "@/types/media";
import { formatFileSize } from "@/lib/media/image-optimizer";
import { deleteMedia } from "@/lib/supabase/media";
import { format } from "date-fns";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface MediaLibraryListProps {
  media: MediaWithVariants[];
  loading?: boolean;
  selectedIds: Set<string>;
  onSelect?: (mediaId: string, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onItemClick?: (media: MediaWithVariants) => void;
  onDelete?: () => void;
}

export function MediaLibraryList({
  media,
  loading = false,
  selectedIds,
  onSelect,
  onSelectAll,
  onItemClick,
  onDelete,
}: MediaLibraryListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(mediaId);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(confirmDeleteId);
    try {
      await deleteMedia(confirmDeleteId);
      onDelete?.();
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media");
    } finally {
      setDeleting(null);
      setConfirmDeleteId(null);
    }
  };

  const handleCheckboxChange = (mediaId: string, checked: boolean) => {
    onSelect?.(mediaId, checked);
  };

  const allSelected = media.length > 0 && selectedIds.size === media.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-2" />
        <p className="text-sm text-muted-foreground">Loading media...</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">No media found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk Selection Info */}
      {selectedIds.size > 0 && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <p className="text-sm text-blue-900">
            {selectedIds.size} {selectedIds.size === 1 ? "image" : "images"} selected
          </p>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b sticky top-0">
            <tr>
              <th className="p-3 text-left w-10">
                <CheckboxComponent
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={(checked) => onSelectAll?.(checked === true)}
                />
              </th>
              <th className="p-3 text-left font-medium">Name</th>
              <th className="p-3 text-left font-medium w-32">Dimensions</th>
              <th className="p-3 text-left font-medium w-24">Size</th>
              <th className="p-3 text-left font-medium w-32">Created</th>
              <th className="p-3 text-left font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {media.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const totalSize = item.variants.reduce(
                (sum, v) => sum + (v.size_bytes || 0),
                0
              );

              return (
                <tr
                  key={item.id}
                  className={`border-b hover:bg-muted/50 transition-colors ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                  onClick={() => onItemClick?.(item)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <CheckboxComponent
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(item.id, checked === true)
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.slug}
                      </p>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {item.original_width}×{item.original_height}px
                  </td>
                  <td className="p-3 text-xs">
                    {formatFileSize(totalSize)}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(new Date(item.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteClick(item.id, e)}
                        disabled={deleting === item.id}
                        title="Delete"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDeleteModal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Are you sure?"
        message="This image will be permanently deleted. This cannot be undone."
        isDeleting={deleting !== null}
      />
    </div>
  );
}
