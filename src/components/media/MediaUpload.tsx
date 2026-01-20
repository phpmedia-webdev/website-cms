"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { getClientBucket } from "@/lib/supabase/schema";
import { Upload, X } from "lucide-react";

interface MediaUploadProps {
  onUploadComplete?: (mediaId: string) => void;
  accept?: string;
}

export function MediaUpload({ onUploadComplete, accept = "image/*" }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const supabase = createClientSupabaseClient();
      const bucket = getClientBucket();

      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Get image dimensions
      let width: number | null = null;
      let height: number | null = null;

      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise((resolve) => {
          img.onload = () => {
            width = img.width;
            height = img.height;
            resolve(null);
          };
        });
      }

      // Create media record
      const { data: mediaData, error: mediaError } = await supabase
        .from("media")
        .insert({
          type: "image",
          url: urlData.publicUrl,
          provider: "supabase",
          filename: file.name,
          mime_type: file.type,
          size: file.size,
          width,
          height,
          alt_text: altText || null,
        })
        .select()
        .single();

      if (mediaError) {
        throw mediaError;
      }

      // Reset form
      setFile(null);
      setPreview(null);
      setAltText("");

      if (onUploadComplete && mediaData) {
        onUploadComplete(mediaData.id);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setAltText("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="flex-1"
          disabled={uploading}
        />
      </div>

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="max-h-64 w-auto rounded-lg border"
          />
          <div className="mt-2 space-y-2">
            <Input
              placeholder="Alt text (optional)"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              disabled={uploading}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                size="sm"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                disabled={uploading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
