"use client";

import { useState, useEffect } from "react";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Media } from "@/types/content";
import { Search, Image as ImageIcon, Video } from "lucide-react";
import Image from "next/image";

interface MediaLibraryProps {
  onSelect?: (media: Media) => void;
  type?: "image" | "video" | "all";
}

export function MediaLibrary({ onSelect, type = "all" }: MediaLibraryProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMedia();
  }, [type, search]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const supabase = createClientSupabaseClient();
      let query = supabase.from("media").select("*").order("created_at", { ascending: false });

      if (type !== "all") {
        query = query.eq("type", type);
      }

      if (search) {
        query = query.or(`filename.ilike.%${search}%,alt_text.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error("Error loading media:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;

    try {
      const supabase = createClientSupabaseClient();
      const { error } = await supabase.from("media").delete().eq("id", id);

      if (error) throw error;
      loadMedia();
    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media item.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search media..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : media.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No media found</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item) => (
            <Card
              key={item.id}
              className="relative group cursor-pointer overflow-hidden"
              onClick={() => onSelect?.(item)}
            >
              <div className="aspect-square relative bg-muted">
                {item.type === "image" ? (
                  <Image
                    src={item.url}
                    alt={item.alt_text || item.filename || "Media"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {item.type === "image" ? (
                    <ImageIcon className="h-4 w-4 text-white drop-shadow" />
                  ) : (
                    <Video className="h-4 w-4 text-white drop-shadow" />
                  )}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs truncate">{item.filename || "Untitled"}</p>
              </div>
              {onSelect && (
                <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button size="sm" variant="secondary">
                    Select
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
