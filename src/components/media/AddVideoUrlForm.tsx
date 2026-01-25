"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateVideoUrl, normalizeVideoUrl } from "@/lib/media/storage";
import { createMedia, getMediaById } from "@/lib/supabase/media";
import { MediaWithVariants } from "@/types/media";

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "video";
}

interface AddVideoUrlFormProps {
  onSuccess?: (media: MediaWithVariants) => void;
  onError?: (error: Error) => void;
}

export function AddVideoUrlForm({ onSuccess, onError }: AddVideoUrlFormProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validation = validateVideoUrl(url);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid video URL");
      return;
    }
    const normalizedUrl = normalizeVideoUrl(url);
    const displayName = name.trim() || "Video";
    const baseSlug = slugFromName(displayName);
    const slug = `${baseSlug}-${Date.now()}`;

    setLoading(true);
    try {
      const created = await createMedia({
        name: displayName,
        slug,
        original_filename: "video-url",
        original_format: "url",
        original_size_bytes: 0,
        original_width: null,
        original_height: null,
        mime_type: null,
        media_type: "video",
        video_url: normalizedUrl,
      });
      const media = await getMediaById(created.id);
      if (!media) throw new Error("Failed to fetch created media");
      onSuccess?.(media);
      setUrl("");
      setName("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add video";
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="video-url">Video URL</Label>
        <Input
          id="video-url"
          type="url"
          placeholder="https://www.youtube.com/... or Vimeo, Adilo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          YouTube, Vimeo, or Adilo (https://adilo.bigcommand.com/)
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="video-name">Name (optional)</Label>
        <Input
          id="video-name"
          type="text"
          placeholder="e.g. Product demo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      </div>
      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        {loading ? "Adding…" : "Add Video URL"}
      </Button>
    </form>
  );
}
