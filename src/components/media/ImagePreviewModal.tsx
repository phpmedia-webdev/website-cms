"use client";

import { useState } from "react";
import { X, Copy, Download, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaWithVariants } from "@/types/media";
import { updateMedia, deleteMedia } from "@/lib/supabase/media";
import { formatFileSize } from "@/lib/media/image-optimizer";
import Image from "next/image";

interface ImagePreviewModalProps {
  media: MediaWithVariants;
  onClose: () => void;
  onUpdate?: (media: MediaWithVariants) => void;
  onDelete?: () => void;
}

export function ImagePreviewModal({
  media,
  onClose,
  onUpdate,
  onDelete,
}: ImagePreviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: media.name,
    slug: media.slug,
    alt_text: media.alt_text || "",
    description: media.description || "",
  });

  const handleCopyUrl = (url: string, variantType: string) => {
    navigator.clipboard.writeText(url);
    setCopied(variantType);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateMedia(media.id, formData);
      const updatedMedia: MediaWithVariants = {
        ...updated,
        variants: media.variants,
      };
      onUpdate?.(updatedMedia);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating media:", error);
      alert("Failed to update media");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this media? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMedia(media.id);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media");
    } finally {
      setIsDeleting(false);
    }
  };

  // Get display image (prefer original, fallback to large)
  const displayVariant = media.variants.find((v) => v.variant_type === "original") ||
    media.variants.find((v) => v.variant_type === "large");
  const displayUrl = displayVariant?.url || "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h2 className="font-semibold truncate">{media.name}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Image Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="relative bg-muted rounded-lg overflow-hidden">
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt={media.alt_text || media.name}
                  width={600}
                  height={400}
                  className="w-full h-auto max-h-96 object-contain"
                />
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>
          </div>

          {/* Variants Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Variants ({media.variants.length})</Label>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {media.variants.map((variant) => (
                <div
                  key={variant.id}
                  className="p-3 bg-muted rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium capitalize">
                        {variant.variant_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {variant.width}×{variant.height}px • {formatFileSize(variant.size_bytes || 0)} • {variant.format.toUpperCase()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleCopyUrl(variant.url, variant.id)}
                      title="Copy URL"
                    >
                      {copied === variant.id ? (
                        <span className="text-xs">✓</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <code className="text-xs bg-background p-1.5 rounded block truncate">
                    {variant.url}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Original File Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded space-y-1">
            <p className="text-xs font-medium text-blue-900">Original File</p>
            <p className="text-xs text-blue-800">
              {media.original_filename} • {formatFileSize(media.original_size_bytes)} • {media.original_width}×{media.original_height}px
            </p>
          </div>

          {/* Edit Section */}
          {isEditing ? (
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h3 className="font-medium text-sm">Edit Metadata</h3>

              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Image name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-slug" className="text-sm">
                  Slug
                </Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="image-slug"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-alt" className="text-sm">
                  Alt Text
                </Label>
                <Input
                  id="edit-alt"
                  value={formData.alt_text}
                  onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                  placeholder="Describe the image"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="text-sm">
                  Description
                </Label>
                <textarea
                  id="edit-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background resize-none h-20"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: media.name,
                      slug: media.slug,
                      alt_text: media.alt_text || "",
                      description: media.description || "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Name</p>
                <p className="text-sm">{media.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Slug</p>
                <p className="text-sm font-mono">{media.slug}</p>
              </div>
              {media.alt_text && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Alt Text</p>
                  <p className="text-sm">{media.alt_text}</p>
                </div>
              )}
              {media.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{media.description}</p>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="w-full mt-2"
              >
                Edit Metadata
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
