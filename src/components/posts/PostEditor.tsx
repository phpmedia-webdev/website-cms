"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaLibrary } from "@/components/media/MediaLibrary";
import { Post, Media } from "@/types/content";
import { Save, Eye, X } from "lucide-react";
import { useSlug } from "@/hooks/useSlug";

interface PostEditorProps {
  post?: Post;
}

export function PostEditor({ post }: PostEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug, slugFromTitle] = useSlug(post?.slug || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState<Record<string, unknown> | null>(
    post?.content || null
  );
  const [status, setStatus] = useState<"draft" | "published">(
    (post?.status as "draft" | "published") || "draft"
  );
  const [featuredImageId, setFeaturedImageId] = useState<string | null>(
    post?.featured_image_id || null
  );
  const [featuredImage, setFeaturedImage] = useState<Media | null>(null);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (title && !slug) {
      slugFromTitle(title);
    }
  }, [title, slug, slugFromTitle]);

  useEffect(() => {
    if (featuredImageId) {
      loadFeaturedImage();
    }
  }, [featuredImageId]);

  const loadFeaturedImage = async () => {
    if (!featuredImageId) return;
    const supabase = createClientSupabaseClient();
    const { data } = await supabase
      .from("media")
      .select("*")
      .eq("id", featuredImageId)
      .single();
    if (data) {
      setFeaturedImage(data as Media);
    }
  };

  const handleSave = async () => {
    if (!title || !slug) {
      alert("Title and slug are required");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClientSupabaseClient();
      const postData = {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        featured_image_id: featuredImageId,
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
      };

      if (post) {
        // Update existing post
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", post.id);

        if (error) throw error;
      } else {
        // Create new post
        const { data, error } = await supabase
          .from("posts")
          .insert(postData)
          .select()
          .single();

        if (error) throw error;
        router.push(`/admin/posts/${data.id}`);
        return;
      }

      router.push("/admin/posts");
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectMedia = (media: Media) => {
    setFeaturedImageId(media.id);
    setFeaturedImage(media);
    setShowMediaLibrary(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {post ? "Edit Post" : "New Post"}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/posts")}
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
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Slug</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="post-url-slug"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Excerpt
                </label>
                <Input
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="Brief description of the post"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publish</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "draft" | "published")
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Featured Image</CardTitle>
              <CardDescription>
                Add a featured image for this post
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featuredImage ? (
                <div className="relative">
                  <img
                    src={featuredImage.url}
                    alt={featuredImage.alt_text || ""}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setFeaturedImageId(null);
                      setFeaturedImage(null);
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
            <CardTitle>Select Featured Image</CardTitle>
          </CardHeader>
          <CardContent>
            <MediaLibrary type="image" onSelect={handleSelectMedia} />
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
