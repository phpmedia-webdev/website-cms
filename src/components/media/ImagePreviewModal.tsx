"use client";

import { useState, useEffect } from "react";
import { X, Copy, Trash2, Loader2, Save, FolderDown, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaWithVariants } from "@/types/media";
import { updateMedia, deleteMedia } from "@/lib/supabase/media";
import { formatFileSize } from "@/lib/media/image-optimizer";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { TaxonomyAssignment } from "@/components/taxonomy/TaxonomyAssignment";
import {
  getPublishedGalleries,
  getGalleriesForMedia,
  addMediaToGallery,
  removeMediaFromGallery,
  type GalleryListItem,
} from "@/lib/supabase/galleries";
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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [localCopyStatus, setLocalCopyStatus] = useState<Record<string, "not_copied" | "copied" | "copying">>({});

  const [formData, setFormData] = useState({
    name: media.name,
    slug: media.slug,
    alt_text: media.alt_text || "",
    description: media.description || "",
  });

  const [publishedGalleries, setPublishedGalleries] = useState<GalleryListItem[]>([]);
  const [assignedGalleryIds, setAssignedGalleryIds] = useState<Set<string>>(new Set());
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryToggling, setGalleryToggling] = useState<string | null>(null);
  const [galleryFeedback, setGalleryFeedback] = useState<{ message: string; galleryName: string } | null>(null);

  const [availableMags, setAvailableMags] = useState<{ id: string; name: string; uid: string }[]>([]);
  const [selectedMagIds, setSelectedMagIds] = useState<string[]>([]);
  const [magsLoading, setMagsLoading] = useState(true);
  const [magsToggling, setMagsToggling] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setGalleryLoading(true);
      const [galleries, assignments] = await Promise.all([
        getPublishedGalleries(),
        getGalleriesForMedia(media.id),
      ]);
      setPublishedGalleries(galleries);
      setAssignedGalleryIds(new Set(assignments.map((a) => a.gallery_id)));
      setGalleryLoading(false);
    }
    load();
  }, [media.id]);

  useEffect(() => {
    async function load() {
      setMagsLoading(true);
      try {
        const [magsRes, mediaMagsRes] = await Promise.all([
          fetch("/api/crm/mags"),
          fetch(`/api/media/${media.id}/mags`),
        ]);
        const mags = magsRes.ok ? (await magsRes.json()) ?? [] : [];
        const { mag_ids } = mediaMagsRes.ok ? (await mediaMagsRes.json()) ?? {} : {};
        setAvailableMags(mags);
        setSelectedMagIds(Array.isArray(mag_ids) ? mag_ids : []);
      } catch {
        setAvailableMags([]);
        setSelectedMagIds([]);
      } finally {
        setMagsLoading(false);
      }
    }
    load();
  }, [media.id]);

  const handleMagToggle = async (magId: string, currentlyAssigned: boolean) => {
    setMagsToggling(magId);
    try {
      const nextIds = currentlyAssigned
        ? selectedMagIds.filter((id) => id !== magId)
        : [...selectedMagIds, magId];
      const res = await fetch(`/api/media/${media.id}/mags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mag_ids: nextIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to update membership");
        return;
      }
      setSelectedMagIds(nextIds);
      onUpdate?.(media);
    } finally {
      setMagsToggling(null);
    }
  };

  const handleGalleryToggle = async (galleryId: string, currentlyAssigned: boolean) => {
    const gallery = publishedGalleries.find((g) => g.id === galleryId);
    const galleryName = gallery?.name ?? "gallery";

    setGalleryToggling(galleryId);
    setGalleryFeedback(null);
    try {
      const err = currentlyAssigned
        ? await removeMediaFromGallery(media.id, galleryId)
        : await addMediaToGallery(media.id, galleryId);
      if (err) {
        alert(err);
        return;
      }
      setAssignedGalleryIds((prev) => {
        const next = new Set(prev);
        if (currentlyAssigned) next.delete(galleryId);
        else next.add(galleryId);
        return next;
      });
      setGalleryFeedback({
        message: currentlyAssigned ? "Removed from" : "Added to",
        galleryName,
      });
      setTimeout(() => setGalleryFeedback(null), 3000);
    } finally {
      setGalleryToggling(null);
    }
  };

  const handleCopyUrl = (url: string, variantId: string) => {
    navigator.clipboard.writeText(url);
    setCopied(variantId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveToLocal = (variantId: string) => {
    setLocalCopyStatus((prev) => ({ ...prev, [variantId]: "copying" }));
    // Stub: Save to Local workflow (folder picker, copy to public/) not yet implemented.
    setTimeout(() => {
      setLocalCopyStatus((prev) => ({ ...prev, [variantId]: "not_copied" }));
    }, 300);
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

  const handleConfirmDelete = async () => {
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
      setShowConfirmDelete(false);
    }
  };

  // Get display image (prefer original, fallback to large)
  const displayVariant = media.variants.find((v) => v.variant_type === "original") ||
    media.variants.find((v) => v.variant_type === "large");
  const displayUrl = displayVariant?.url || "";

  return (
    <>
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between gap-2 z-10">
          <h2 className="font-semibold truncate min-w-0 flex-1">{media.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete media
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* a. Image Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="relative bg-muted rounded-lg overflow-hidden">
              {displayUrl ? (
                <Image
                  src={displayUrl}
                  alt={media.alt_text || media.name}
                  width={600}
                  height={400}
                  className="w-full h-auto max-h-72 object-contain"
                />
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground">
                  No preview available
                </div>
              )}
            </div>
          </div>

          {/* b. Original File Info */}
          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded space-y-0.5">
            <p className="text-xs text-blue-900">
              <span className="font-medium">Original File: Section Type – {(media.media_type ?? "image") === "video" ? "Video" : "Image"}</span>
            </p>
            <p className="text-xs text-blue-800">
              {media.original_filename} • {formatFileSize(media.original_size_bytes)}
              {media.original_width != null && media.original_height != null && (
                <> • {media.original_width}×{media.original_height}px</>
              )}
            </p>
          </div>

          {/* c. Edit Metadata Section */}
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
            <div className="flex gap-4 p-3 bg-muted rounded-lg items-start">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Name</p>
                  <p className="text-sm truncate">{media.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Slug</p>
                  <p className="text-sm font-mono truncate">{media.slug}</p>
                </div>
                {media.alt_text && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Alt Text</p>
                    <p className="text-sm line-clamp-2">{media.alt_text}</p>
                  </div>
                )}
                {media.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Description</p>
                    <p className="text-sm line-clamp-2">{media.description}</p>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="shrink-0"
              >
                Edit Metadata
              </Button>
            </div>
          )}

          {/* Tabbed sections: Taxonomy, Galleries, Variants, Membership (last) */}
          <Tabs defaultValue="taxonomy" className="w-full">
            <TabsList className="flex w-full flex-wrap gap-1 h-auto p-1">
              <TabsTrigger value="taxonomy" className="flex-1 min-w-0">Taxonomy</TabsTrigger>
              <TabsTrigger value="galleries" className="flex-1 min-w-0">Galleries</TabsTrigger>
              <TabsTrigger value="variants" className="flex-1 min-w-0">Variants ({media.variants.length})</TabsTrigger>
              <TabsTrigger value="membership" className="flex-1 min-w-0">Memberships</TabsTrigger>
            </TabsList>

            {/* Tab 1: Taxonomy (Categories & Tags) */}
            <TabsContent value="taxonomy" className="space-y-2 mt-4">
              <p className="text-xs text-muted-foreground">
                MAG tags allow filtering by memberships. Restrict access via the Memberships tab.
              </p>
              <TaxonomyAssignment
                mediaId={media.id}
                mediaType={(media.media_type ?? "image") as "image" | "video"}
                onSaved={() => onUpdate?.(media)}
                disabled={isSaving}
              />
            </TabsContent>

            {/* Tab 2: Galleries */}
            <TabsContent value="galleries" className="space-y-3 mt-4">
              <Label className="text-sm font-medium">Assign to galleries</Label>
              <p className="text-xs text-muted-foreground">
                Add or remove this media from galleries.
              </p>
              {galleryFeedback && (
                <p className="text-sm text-primary font-medium">
                  {galleryFeedback.message} {galleryFeedback.galleryName}
                </p>
              )}
              {galleryLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading galleries…
                </div>
              ) : publishedGalleries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No published galleries yet. Create and publish a gallery first.
                </p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {publishedGalleries.map((g) => {
                    const isAssigned = assignedGalleryIds.has(g.id);
                    const toggling = galleryToggling === g.id;
                    return (
                      <li
                        key={g.id}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md border ${
                          isAssigned
                            ? "border-primary bg-primary/5"
                            : "border-input bg-muted/30"
                        } ${toggling ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Checkbox
                            id={`gallery-${g.id}`}
                            checked={isAssigned}
                            onCheckedChange={() => handleGalleryToggle(g.id, isAssigned)}
                            disabled={toggling}
                          />
                          <label
                            htmlFor={`gallery-${g.id}`}
                            className="text-sm font-medium truncate cursor-pointer flex-1"
                          >
                            {g.name}
                          </label>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {isAssigned ? "In gallery" : "Not in gallery"}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => handleGalleryToggle(g.id, isAssigned)}
                          disabled={toggling}
                          title={isAssigned ? `Remove from ${g.name}` : `Add to ${g.name}`}
                        >
                          {toggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isAssigned ? (
                            <><Minus className="h-3.5 w-3.5 mr-1" /> Remove</>
                          ) : (
                            <><Plus className="h-3.5 w-3.5 mr-1" /> Add</>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>

            {/* Tab 4: Variants */}
            <TabsContent value="variants" className="space-y-2 mt-4">
              <div className="grid gap-1.5 max-h-64 overflow-y-auto overflow-x-hidden min-w-0">
                {media.variants.map((variant) => (
                  <div
                    key={variant.id}
                    className="px-2.5 py-2 bg-muted rounded-md space-y-1.5 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <p className="text-xs text-foreground truncate min-w-0">
                        <span className="text-sm font-semibold capitalize">
                          {variant.variant_type}
                        </span>
                        <span className="text-muted-foreground font-normal mx-1">·</span>
                        {variant.width}×{variant.height}px
                        <span className="text-muted-foreground font-normal mx-1">·</span>
                        {formatFileSize(variant.size_bytes || 0)}
                        <span className="text-muted-foreground font-normal mx-1">·</span>
                        {variant.format.toUpperCase()}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleSaveToLocal(variant.id)}
                          disabled={localCopyStatus[variant.id] === "copying"}
                          title="Copy variant to local public/ folder"
                        >
                          {localCopyStatus[variant.id] === "copying" ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <FolderDown className="h-3 w-3 mr-1" />
                          )}
                          Save to Local
                        </Button>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {localCopyStatus[variant.id] === "copying"
                            ? "Copying…"
                            : localCopyStatus[variant.id] === "copied"
                              ? "Copied to /images/…"
                              : "Not copied"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0 min-w-0 rounded border border-input bg-background overflow-hidden">
                      <Input
                        readOnly
                        value={variant.url}
                        className="h-7 border-0 rounded-none bg-transparent text-xs truncate min-w-0 flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 py-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 rounded-none border-l border-input"
                        onClick={() => handleCopyUrl(variant.url, variant.id)}
                        title="Copy URL"
                      >
                        {copied === variant.id ? (
                          <span className="text-xs">✓</span>
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Tab 4: Memberships (last) — restrict media to memberships */}
            <TabsContent value="membership" className="space-y-3 mt-4">
              <Label className="text-sm font-medium">Restrict to memberships</Label>
              <p className="text-xs text-muted-foreground">
                Only users with at least one of these memberships can see this media in galleries and on the site.
              </p>
              {magsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading memberships…
                </div>
              ) : availableMags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No memberships yet. Create one under CRM → Memberships.
                </p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {availableMags.map((mag) => {
                    const isAssigned = selectedMagIds.includes(mag.id);
                    const toggling = magsToggling === mag.id;
                    return (
                      <li
                        key={mag.id}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md border ${
                          isAssigned
                            ? "border-primary bg-primary/5"
                            : "border-input bg-muted/30"
                        } ${toggling ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Checkbox
                            id={`mag-${mag.id}`}
                            checked={isAssigned}
                            onCheckedChange={() => handleMagToggle(mag.id, isAssigned)}
                            disabled={toggling}
                          />
                          <label
                            htmlFor={`mag-${mag.id}`}
                            className="text-sm font-medium truncate cursor-pointer flex-1"
                          >
                            {mag.name}
                          </label>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {isAssigned ? "Required" : "—"}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0"
                          onClick={() => handleMagToggle(mag.id, isAssigned)}
                          disabled={toggling}
                          title={isAssigned ? `Remove ${mag.name} restriction` : `Require ${mag.name}`}
                        >
                          {toggling ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isAssigned ? (
                            <><Minus className="h-3.5 w-3.5 mr-1" /> Remove</>
                          ) : (
                            <><Plus className="h-3.5 w-3.5 mr-1" /> Add</>
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>

    <ConfirmDeleteModal
      open={showConfirmDelete}
      onClose={() => setShowConfirmDelete(false)}
      onConfirm={handleConfirmDelete}
      title="Delete media?"
      message="This media item will be permanently deleted. This cannot be undone."
      isDeleting={isDeleting}
    />
    </>
  );
}
