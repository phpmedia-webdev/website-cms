"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { Gallery, Media } from "@/types/content";
import { Save, X } from "lucide-react";
import { useSlug } from "@/hooks/useSlug";
import Image from "next/image";

interface GalleryEditorProps {
  gallery?: Gallery;
}

export function GalleryEditor({ gallery }: GalleryEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(gallery?.name || "");
  const [slug, setSlug, slugFromTitle] = useSlug(gallery?.slug || "");
  const [description, setDescription] = useState(gallery?.description || "");
  const [coverImageId, setCoverImageId] = useState<string | null>(
    gallery?.cover_image_id || null
  );
  const [coverImage, setCoverImage] = useState<Media | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const loadCoverImage = async () => {
    if (!coverImageId) return;
    const supabase = createClientSupabaseClient();
    const { data } = await supabase
      .from("media")
      .select("*")
      .eq("id", coverImageId)
      .single();
    if (data) {
      setCoverImage(data as Media);
    }
  };

  const loadGalleryItems = async () => {
    if (!gallery?.id) return;
    const supabase = createClientSupabaseClient();
    const { data } = await supabase
      .from("gallery_items")
      .select("*, media(*)")
      .eq("gallery_id", gallery.id)
      .order("position", { ascending: true });
    if (data) {
      setItems(data);
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
      };

      if (gallery) {
        const { error } = await supabase
          .from("galleries")
          .update(galleryData)
          .eq("id", gallery.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("galleries")
          .insert(galleryData)
          .select()
          .single();
        if (error) throw error;
        router.push(`/admin/galleries/${data.id}`);
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

  const handleAddMedia = async (media: Media) => {
    if (!gallery?.id) {
      alert("Please save the gallery first before adding items");
      return;
    }

    try {
      const supabase = createClientSupabaseClient();
      const maxPosition = items.length > 0 
        ? Math.max(...items.map((i: any) => i.position || 0))
        : -1;

      const { error } = await supabase.from("gallery_items").insert({
        gallery_id: gallery.id,
        media_id: media.id,
        position: maxPosition + 1,
      });

      if (error) throw error;
      loadGalleryItems();
      setShowMediaLibrary(false);
    } catch (error) {
      console.error("Error adding media:", error);
      alert("Failed to add media to gallery.");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      const supabase = createClientSupabaseClient();
      const { error } = await supabase
        .from("gallery_items")
        .delete()
        .eq("id", itemId);
      if (error) throw error;
      loadGalleryItems();
    } catch (error) {
      console.error("Error removing item:", error);
      alert("Failed to remove item.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {gallery ? "Edit Gallery" : "New Gallery"}
        </h1>
        <div className="flex gap-2">
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Gallery description"
                />
              </div>
            </CardContent>
          </Card>

          {gallery?.id && (
            <Card>
              <CardHeader>
                <CardTitle>Gallery Items</CardTitle>
                <CardDescription>
                  Add images and videos to this gallery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={() => setShowMediaLibrary(true)}
                  className="mb-4"
                >
                  Add Media
                </Button>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No items in this gallery yet
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {items.map((item: any) => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
                          {item.media?.type === "image" ? (
                            <Image
                              src={item.media.url}
                              alt={item.media.alt_text || ""}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-xs text-muted-foreground">
                                Video
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
              <CardDescription>
                Set a cover image for this gallery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coverImage ? (
                <div className="relative">
                  <img
                    src={coverImage.url}
                    alt={coverImage.alt_text || ""}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setCoverImageId(null);
                      setCoverImage(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowMediaLibrary(true)}
                  className="w-full"
                >
                  Select Image
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showMediaLibrary && (
        <Card>
          <CardHeader>
            <CardTitle>Select Media</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaLibrary
              type="all"
              onSelect={(media) => {
                if (gallery?.id) {
                  handleAddMedia(media);
                } else {
                  setCoverImageId(media.id);
                  setCoverImage(media);
                  setShowMediaLibrary(false);
                }
              }}
            />
            <Button
              variant="outline"
              onClick={() => setShowMediaLibrary(false)}
              className="mt-4"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
