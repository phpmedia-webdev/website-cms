"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { getClientSchema } from "@/lib/supabase/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GalleryMediaPicker } from "@/components/galleries/GalleryMediaPicker";
import { DisplayStyleModal, type DisplayStyleFormValues } from "@/components/galleries/DisplayStyleModal";
import { ConfirmDeleteModal } from "@/components/media/ConfirmDeleteModal";
import { getMediaWithVariants } from "@/lib/supabase/media";
import { getMediaUrls } from "@/lib/supabase/galleries";
import { Badge } from "@/components/ui/badge";
import { Gallery, GalleryDisplayStyle, Media } from "@/types/content";
import { Save, X, Trash2, LayoutGrid, List, Copy, Plus, Pencil, GripVertical, Loader2 } from "lucide-react";
import { useSlug } from "@/hooks/useSlug";
import { generateGalleryShortcode } from "@/lib/shortcodes/gallery";
import Image from "next/image";

interface GalleryEditorProps {
  gallery?: Gallery;
}

export function GalleryEditor({ gallery }: GalleryEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(gallery?.name || "");
  const [slug, setSlug, slugFromTitle] = useSlug(gallery?.slug || "");
  const [description, setDescription] = useState(gallery?.description || "");
  const [status, setStatus] = useState<"draft" | "published">(
    (gallery?.status as "draft" | "published") || "draft"
  );
  const [coverImageId, setCoverImageId] = useState<string | null>(
    gallery?.cover_image_id || null
  );
  const [coverImage, setCoverImage] = useState<Media | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pickerMedia, setPickerMedia] = useState<Awaited<ReturnType<typeof getMediaWithVariants>>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState<"gallery" | "cover">("gallery");
  const [isAddingMedia, setIsAddingMedia] = useState(false);
  const [itemsView, setItemsView] = useState<"grid" | "list">("grid");
  type SortOrderType = "as_added" | "name_asc" | "name_desc" | "date_newest" | "date_oldest" | "custom";
  const [itemsSortOrder, setItemsSortOrder] = useState<SortOrderType>("as_added");
  const [reorderLoading, setReorderLoading] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const [displayStyles, setDisplayStyles] = useState<GalleryDisplayStyle[]>([]);
  const [showDisplayStyleModal, setShowDisplayStyleModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<GalleryDisplayStyle | null>(null);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  
  // Membership protection
  const [accessLevel, setAccessLevel] = useState<"public" | "members" | "mag">(
    (gallery?.access_level as "public" | "members" | "mag") || "public"
  );
  const [visibilityMode, setVisibilityMode] = useState<"hidden" | "message">(
    (gallery?.visibility_mode as "hidden" | "message") || "hidden"
  );
  const [restrictedMessage, setRestrictedMessage] = useState(
    gallery?.restricted_message || ""
  );
  const [selectedMagIds, setSelectedMagIds] = useState<string[]>([]);
  const [availableMags, setAvailableMags] = useState<{ id: string; name: string; uid: string }[]>([]);

  useEffect(() => {
    if (name && !slug) {
      slugFromTitle(name);
    }
  }, [name, slug, slugFromTitle]);

  useEffect(() => {
    if (coverImageId) {
      loadCoverImage();
    }
  }, [coverImageId]);

  useEffect(() => {
    if (gallery?.id) {
      loadGalleryItems();
    }
  }, [gallery?.id]);

  useEffect(() => {
    if (gallery?.id) {
      loadDisplayStyles();
    } else {
      setDisplayStyles([]);
    }
  }, [gallery?.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all MAGs for picker
  useEffect(() => {
    fetch("/api/crm/mags")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAvailableMags(data ?? []))
      .catch(() => setAvailableMags([]));
  }, []);

  // Load gallery's assigned MAGs
  useEffect(() => {
    if (gallery?.id) {
      fetch(`/api/galleries/${gallery.id}/mags`)
        .then((res) => (res.ok ? res.json() : { mag_ids: [] }))
        .then(({ mag_ids }) => setSelectedMagIds(mag_ids ?? []))
        .catch(() => setSelectedMagIds([]));
    }
  }, [gallery?.id]);

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/settings/site-metadata")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const url = data?.url?.trim();
        setSiteUrl(url ? url.replace(/\/$/, "") : "");
      })
      .catch(() => setSiteUrl(""));
  }, [mounted]);

  const standaloneFullUrl =
    slug && mounted
      ? (siteUrl || (typeof window !== "undefined" ? window.location.origin : ""))
        ? `${(siteUrl || window.location.origin).replace(/\/$/, "")}/gallery/${slug}`
        : `/gallery/${slug}`
      : slug
        ? `/gallery/${slug}`
        : "";

  const loadDisplayStyles = async () => {
    if (!gallery?.id) return;
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/styles`);
      if (!res.ok) return;
      const { styles } = await res.json();
      setDisplayStyles(styles ?? []);
    } catch {
      setDisplayStyles([]);
    }
  };

  useEffect(() => {
    if (showMediaLibrary) {
      loadPickerMedia();
    }
  }, [showMediaLibrary]);

  const loadCoverImage = async () => {
    if (!coverImageId) return;
    const supabase = createClientSupabaseClient();
    const { data } = await supabase
      .schema(getClientSchema())
      .from("media")
      .select("*")
      .eq("id", coverImageId)
      .single();
    if (data) {
      const media = data as Media;
      const urls = await getMediaUrls([coverImageId]);
      const url = urls.get(coverImageId);
      setCoverImage(url ? { ...media, url } : media);
    }
  };

  const loadGalleryItems = async () => {
    if (!gallery?.id) return;
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/items`);
      if (!res.ok) return;
      const { items } = await res.json();
      setItems(items ?? []);
    } catch (error) {
      console.error("Error loading gallery items:", error);
    }
  };

  const handleSave = async () => {
    if (!name || !slug) {
      alert("Name and slug are required");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClientSupabaseClient();
      const galleryData = {
        name,
        slug,
        description: description || null,
        cover_image_id: coverImageId,
        status,
        access_level: accessLevel,
        visibility_mode: visibilityMode,
        restricted_message: restrictedMessage || null,
      };

      let galleryId = gallery?.id;

      if (gallery) {
        const { error } = await supabase
          .schema(getClientSchema())
          .from("galleries")
          .update(galleryData)
          .eq("id", gallery.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .schema(getClientSchema())
          .from("galleries")
          .insert(galleryData)
          .select()
          .single();
        if (error) throw error;
        galleryId = data.id;
      }

      // Save MAGs (only for 'mag' access level)
      if (galleryId && accessLevel === "mag") {
        await fetch(`/api/galleries/${galleryId}/mags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mag_ids: selectedMagIds }),
        });
      } else if (galleryId) {
        // Clear MAGs if not using 'mag' access level
        await fetch(`/api/galleries/${galleryId}/mags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mag_ids: [] }),
        });
      }

      if (!gallery) {
        router.push(`/admin/galleries/${galleryId}`);
        return;
      }

      router.push("/admin/galleries");
    } catch (error) {
      console.error("Error saving gallery:", error);
      alert("Failed to save gallery. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const displayedItems = useMemo(() => {
    if (itemsSortOrder === "as_added" || itemsSortOrder === "custom") {
      return [...items];
    }
    const sorted = [...items];
    const getMedia = (item: any) => item?.media;
    sorted.sort((a, b) => {
      const ma = getMedia(a);
      const mb = getMedia(b);
      const nameA = (ma?.name ?? "").toLowerCase();
      const nameB = (mb?.name ?? "").toLowerCase();
      const dateA = ma?.created_at ? new Date(ma.created_at).getTime() : 0;
      const dateB = mb?.created_at ? new Date(mb.created_at).getTime() : 0;
      if (itemsSortOrder === "name_asc") return nameA.localeCompare(nameB);
      if (itemsSortOrder === "name_desc") return nameB.localeCompare(nameA);
      if (itemsSortOrder === "date_newest") return dateB - dateA;
      if (itemsSortOrder === "date_oldest") return dateA - dateB;
      return 0;
    });
    return sorted;
  }, [items, itemsSortOrder]);

  const handleReorder = async (orderedItemIds: string[]) => {
    if (!gallery?.id || orderedItemIds.length === 0) return;
    setReorderLoading(true);
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      await loadGalleryItems();
      setItemsSortOrder("custom");
    } catch (err) {
      console.error("Reorder error:", err);
      alert("Failed to reorder items");
    } finally {
      setReorderLoading(false);
      setDraggedItemId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("application/json", JSON.stringify({ itemId }));
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    const targetItem = displayedItems[targetIndex];
    if (!targetItem) return;
    setDropIndicatorIndex(targetItem.id === draggedItemId ? null : targetIndex);
  };

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    setDropIndicatorIndex(null);
    e.preventDefault();
    e.stopPropagation();
    const sourceId =
      e.dataTransfer.getData("text/plain") ||
      (() => {
        try {
          const j = e.dataTransfer.getData("application/json");
          return j ? JSON.parse(j).itemId : "";
        } catch {
          return "";
        }
      })();
    if (!sourceId || sourceId === targetItemId) {
      setDraggedItemId(null);
      return;
    }
    const ids = displayedItems.map((i: any) => i.id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetItemId);
    if (fromIdx < 0 || toIdx < 0) {
      setDraggedItemId(null);
      return;
    }
    const reordered = [...ids];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, sourceId);
    void handleReorder(reordered);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDropIndicatorIndex(null);
  };

  const handleAddMediaBulk = async (mediaIds: string[]) => {
    if (!gallery?.id || mediaIds.length === 0) return;

    // Filter out items already in gallery (prevents 409)
    const alreadyIds = new Set(items.map((i: any) => i.media_id).filter(Boolean));
    const toAdd = mediaIds.filter((id) => !alreadyIds.has(id));
    if (toAdd.length === 0) {
      setShowMediaLibrary(false);
      return;
    }

    setIsAddingMedia(true);
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: toAdd }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Already in gallery – refresh and close
          await loadGalleryItems();
          setShowMediaLibrary(false);
          return;
        }
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      await loadGalleryItems();
      setShowMediaLibrary(false);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error adding media:", msg);
      alert(`Failed to add media to gallery: ${msg}`);
    } finally {
      setIsAddingMedia(false);
    }
  };

  const loadPickerMedia = async () => {
    setPickerLoading(true);
    try {
      const all = await getMediaWithVariants();
      setPickerMedia(all);
    } catch (error) {
      console.error("Error loading media for picker:", error);
      setPickerMedia([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleDeleteGallery = async () => {
    if (!gallery?.id) return;
    setDeleting(true);
    try {
      const supabase = createClientSupabaseClient();
      const { error } = await supabase
        .schema(getClientSchema())
        .from("galleries")
        .delete()
        .eq("id", gallery.id);
      if (error) throw error;
      router.push("/admin/galleries");
    } catch (error) {
      console.error("Error deleting gallery:", error);
      alert("Failed to delete gallery.");
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!gallery?.id) return;
    try {
      const res = await fetch(`/api/galleries/${gallery.id}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      await loadGalleryItems();
    } catch (error) {
      console.error("Error removing item:", error);
      alert("Failed to remove item.");
    }
  };

  const openCoverImagePicker = () => {
    setPickerMode("cover");
    setShowMediaLibrary(true);
  };

  const handleSaveDisplayStyle = async (values: DisplayStyleFormValues) => {
    if (!gallery?.id) return;
    const isEdit = Boolean(editingStyle?.id);
    try {
      if (isEdit && editingStyle?.id) {
        const res = await fetch(
          `/api/galleries/${gallery.id}/styles/${editingStyle.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          }
        );
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to update");
        }
      } else {
        const res = await fetch(`/api/galleries/${gallery.id}/styles`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error ?? "Failed to create");
        }
      }
      await loadDisplayStyles();
      setEditingStyle(null);
    } catch (err) {
      console.error("Display style save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save display style.");
      throw err;
    }
  };

  const handleDeleteDisplayStyle = async (styleId: string) => {
    if (!gallery?.id || !confirm("Delete this display style?")) return;
    try {
      const res = await fetch(
        `/api/galleries/${gallery.id}/styles/${styleId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      await loadDisplayStyles();
      if (editingStyle?.id === styleId) {
        setEditingStyle(null);
        setShowDisplayStyleModal(false);
      }
    } catch {
      alert("Failed to delete display style.");
    }
  };

  const openAddDisplayStyle = () => {
    setEditingStyle(null);
    setShowDisplayStyleModal(true);
  };

  const openEditDisplayStyle = (style: GalleryDisplayStyle) => {
    setEditingStyle(style);
    setShowDisplayStyleModal(true);
  };

  const copyStyleShortcode = (styleId: string) => {
    if (!gallery?.id) return;
    const code = generateGalleryShortcode(gallery.id, styleId);
    void navigator.clipboard.writeText(code);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {gallery ? "Edit Gallery" : "New Gallery"}
        </h1>
        <div className="flex gap-2">
          {gallery?.id && (
            <Button
              variant="destructive"
              onClick={() => setShowConfirmDelete(true)}
              disabled={saving}
              className="mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push("/admin/galleries")}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Gallery Details</CardTitle>
              {gallery?.id && (
                <div className="flex items-center gap-2 shrink-0">
                  {coverImage ? (
                    <>
                      <div className="relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                        <Image
                          src={coverImage.url}
                          alt={coverImage.alt_text || ""}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openCoverImagePicker}
                      >
                        Select
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setCoverImageId(null);
                          setCoverImage(null);
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs text-muted-foreground">—</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openCoverImagePicker}
                      >
                        Select Cover Image
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Gallery name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Slug</label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="gallery-url-slug"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Gallery description"
                    rows={6}
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-4 flex flex-col min-h-0">
                {gallery?.id && (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <label className="text-sm font-medium mb-2 block">
                      Display Styles
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Saved presets for how this gallery appears. Use shortcode in posts.
                    </p>
                    <div className="overflow-y-auto max-h-48 flex-1 min-h-0 pr-1 space-y-2">
                      {displayStyles.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No display styles yet
                        </p>
                      ) : (
                        displayStyles.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between gap-2 py-1.5 px-2 rounded border bg-muted/30"
                          >
                            <span className="text-sm truncate">{s.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="secondary" className="text-xs font-normal">
                                {s.layout}
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openEditDisplayStyle(s)}
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => copyStyleShortcode(s.id)}
                                title="Copy shortcode"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDisplayStyle(s.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 shrink-0"
                      onClick={openAddDisplayStyle}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Display Style
                    </Button>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "draft" | "published")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Draft galleries are hidden from the public.
                  </p>
                </div>
                {gallery?.id && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Standalone URL</label>
                    {status === "published" && slug ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`/gallery/${slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate flex-1 min-w-0"
                          title={standaloneFullUrl}
                        >
                          {standaloneFullUrl || `/gallery/${slug}`}
                        </a>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() =>
                            void navigator.clipboard.writeText(
                              standaloneFullUrl || `/gallery/${slug}`
                            )
                          }
                          title="Copy link"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Not available (draft)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Protection */}
        <Card>
          <CardHeader>
            <CardTitle>Membership Protection</CardTitle>
            <CardDescription>
              Control who can view this gallery and its items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Access Level</label>
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as "public" | "members" | "mag")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="public">Public (everyone)</option>
                  <option value="members">Members Only</option>
                  <option value="mag">Specific Memberships</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">When Access Denied</label>
                <select
                  value={visibilityMode}
                  onChange={(e) => setVisibilityMode(e.target.value as "hidden" | "message")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={accessLevel === "public"}
                >
                  <option value="hidden">Hide gallery</option>
                  <option value="message">Show message</option>
                </select>
              </div>
            </div>

            {accessLevel === "mag" && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Required Memberships (any)
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  User must have at least one of these memberships to view.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedMagIds.map((magId) => {
                    const mag = availableMags.find((m) => m.id === magId);
                    return (
                      <Badge key={magId} variant="secondary" className="flex items-center gap-1">
                        {mag?.name || magId}
                        <button
                          type="button"
                          onClick={() => setSelectedMagIds((ids) => ids.filter((id) => id !== magId))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  {selectedMagIds.length === 0 && (
                    <span className="text-sm text-muted-foreground italic">No memberships selected</span>
                  )}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !selectedMagIds.includes(e.target.value)) {
                      setSelectedMagIds((ids) => [...ids, e.target.value]);
                    }
                    e.target.value = "";
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Add membership...</option>
                  {availableMags
                    .filter((m) => !selectedMagIds.includes(m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.uid})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {accessLevel !== "public" && visibilityMode === "message" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Restricted Message</label>
                <Input
                  value={restrictedMessage}
                  onChange={(e) => setRestrictedMessage(e.target.value)}
                  placeholder="This content requires membership to view."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown when user doesn&apos;t have access. Leave blank for default message.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>{showMediaLibrary ? "Select Media" : "Gallery Items"}</CardTitle>
                  <CardDescription>
                    {showMediaLibrary
                      ? pickerMode === "gallery"
                        ? "Select items, then click Add"
                        : "Click an item to set as cover image"
                      : "Add images and videos to this gallery"}
                  </CardDescription>
                </div>
                {!showMediaLibrary && gallery?.id && items.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 flex-1 justify-center min-w-[200px]">
                      <label className="text-sm text-muted-foreground">Sort:</label>
                      <select
                        value={itemsSortOrder}
                        onChange={(e) => {
                          const v = e.target.value as SortOrderType;
                          setItemsSortOrder(v);
                          if (v === "custom") setItemsView("list");
                        }}
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                      >
                        <option value="as_added">As added</option>
                        <option value="name_asc">Name A–Z</option>
                        <option value="name_desc">Name Z–A</option>
                        <option value="date_newest">Date (newest)</option>
                        <option value="date_oldest">Date (oldest)</option>
                        <option value="custom">Custom (drag to arrange)</option>
                      </select>
                      {reorderLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      )}
                      {itemsSortOrder === "custom" && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          Drag to reorder
                        </span>
                      )}
                    </div>
                    <div className="flex rounded-md border p-0.5 shrink-0">
                      <Button
                        variant={itemsView === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setItemsView("grid")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={itemsView === "list" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => setItemsView("list")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
              {showMediaLibrary && pickerMode === "cover" && (
                <p className="text-red-600 text-2xl font-semibold leading-none tracking-tight text-center pt-1">
                  Choose Cover Image
                </p>
              )}
            </CardHeader>
            <CardContent>
              {showMediaLibrary ? (
                <GalleryMediaPicker
              media={pickerMedia}
              loading={pickerLoading}
              mode={pickerMode}
              alreadyInGalleryIds={
                pickerMode === "gallery" && gallery?.id
                  ? new Set(items.map((i: any) => i.media_id).filter(Boolean))
                  : new Set()
              }
              onAddToGallery={pickerMode === "gallery" ? handleAddMediaBulk : undefined}
              onSelectCover={
                pickerMode === "cover"
                  ? (m) => {
                      const url = m.variants?.find(
                        (v) => v.variant_type === "thumbnail" || v.variant_type === "original"
                      )?.url;
                      setCoverImageId(m.id);
                      setCoverImage(
                        url
                          ? ({
                              id: m.id,
                              url,
                              type: (m.media_type ?? "image") as "image" | "video",
                              alt_text: m.alt_text,
                              filename: m.original_filename,
                              provider: null,
                              mime_type: m.mime_type,
                              size: null,
                              width: null,
                              height: null,
                              caption: null,
                              created_at: m.created_at,
                            } as Media)
                          : null
                      );
                      setShowMediaLibrary(false);
                    }
                  : undefined
              }
              onCancel={() => setShowMediaLibrary(false)}
              isAdding={pickerMode === "gallery" && isAddingMedia}
            />
              ) : !gallery?.id ? (
                <p className="text-sm text-muted-foreground py-4">
                  Save the gallery first to add items.
                </p>
              ) : items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No items in this gallery yet
                </p>
              ) : (
                <>
              {itemsView === "grid" ? (
                <div className="max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-2">
                    {displayedItems.map((item: any) => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-square relative bg-muted rounded overflow-hidden">
                          {item.media?.url ? (
                            <Image
                              src={item.media.url}
                              alt={item.media.alt_text || item.media.name || ""}
                              fill
                              className="object-cover"
                              sizes="80px"
                            />
                          ) : item.media?.type === "video" ? (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-[10px] text-muted-foreground">▶</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-[10px] text-muted-foreground">—</span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-0.5 right-0.5 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                        <p className="text-[10px] truncate mt-0.5 px-0.5" title={item.media?.name}>
                          {item.media?.name || "Untitled"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-h-[200px] overflow-y-auto border rounded-md divide-y">
                  {itemsSortOrder === "custom" && (
                    <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 border-b">
                      <GripVertical className="h-3.5 w-3.5 shrink-0" />
                      Use handle to reorder items
                    </p>
                  )}
                  {displayedItems.map((item: any, idx: number) => (
                    <div key={item.id} className="relative">
                      {itemsSortOrder === "custom" && dropIndicatorIndex === idx && (
                        <div
                          className="absolute left-2 right-2 top-0 h-1 bg-primary z-10 rounded-full shadow-sm"
                          aria-hidden
                        />
                      )}
                      <div
                        onDragOver={
                          itemsSortOrder === "custom"
                            ? (e) => handleDragOver(e, idx)
                            : undefined
                        }
                        onDrop={
                          itemsSortOrder === "custom"
                            ? (e) => handleDrop(e, item.id)
                            : undefined
                        }
                        className={`flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 group ${draggedItemId === item.id ? "opacity-50" : ""}`}
                      >
                      {itemsSortOrder === "custom" ? (
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing touch-none shrink-0 p-0.5 -m-0.5"
                          title="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ) : null}
                      <div className="relative w-8 h-8 shrink-0 rounded bg-muted overflow-hidden">
                        {item.media?.url ? (
                          <Image
                            src={item.media.url}
                            alt={item.media.alt_text || item.media.name || ""}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-[10px]">
                            {item.media?.type === "video" ? "▶" : "—"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" title={item.media?.name}>
                          {item.media?.name || "Untitled"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          #{item.position ?? idx + 1}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>
          {!showMediaLibrary && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setPickerMode("gallery");
                  setShowMediaLibrary(true);
                }}
                disabled={!gallery?.id}
              >
                Add Media
              </Button>
            </div>
          )}
        </div>
      </div>

      <DisplayStyleModal
        open={showDisplayStyleModal}
        onClose={() => {
          setShowDisplayStyleModal(false);
          setEditingStyle(null);
        }}
        onSave={handleSaveDisplayStyle}
        galleryId={gallery?.id ?? ""}
        style={editingStyle}
      />

      <ConfirmDeleteModal
        open={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDeleteGallery}
        title="Delete gallery?"
        message="This gallery and all its items will be permanently deleted. This cannot be undone."
        isDeleting={deleting}
      />
    </div>
  );
}
