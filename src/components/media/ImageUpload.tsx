"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  extractFileMetadata,
  generateImageVariants,
  uploadVariantsToStorage,
  validateFileBeforeUpload,
  ensureStorageBucket,
} from "@/lib/media/storage";
import {
  createMedia,
  createMediaVariant,
  getMediaById,
} from "@/lib/supabase/media";
import { generateStoragePath } from "@/lib/media/image-optimizer";
import { getClientBucket } from "@/lib/supabase/schema";
import { MediaWithVariants, UploadProgress, VariantType } from "@/types/media";

interface ImageUploadProps {
  onUploadComplete?: (media: MediaWithVariants) => void;
  onError?: (error: Error) => void;
  maxFileSize?: number;
}

export function ImageUpload({
  onUploadComplete,
  onError,
  maxFileSize = 10 * 1024 * 1024,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    try {
      // Reset progress
      setProgress(null);

      // Validate file
      const validation = await validateFileBeforeUpload(file, maxFileSize);
      if (!validation.valid) {
        const error = new Error(validation.error);
        onError?.(error);
        setProgress(null);
        return;
      }

      // Get bucket name
      const bucket = getClientBucket();

      // Verify bucket exists
      try {
        await ensureStorageBucket(bucket);
      } catch (bucketError) {
        const error = bucketError instanceof Error ? bucketError : new Error("Storage bucket verification failed");
        onError?.(error);
        setProgress({
          fileName: file.name,
          totalSize: file.size,
          uploadedBytes: 0,
          percentComplete: 0,
          variantsGenerating: [],
          variantsComplete: [],
          status: "error",
          error: error.message,
        });
        return;
      }

      // Extract metadata
      setProgress({
        fileName: file.name,
        totalSize: file.size,
        uploadedBytes: 0,
        percentComplete: 10,
        variantsGenerating: [],
        variantsComplete: [],
        status: "uploading",
      });

      const metadata = await extractFileMetadata(file);

      // Generate variants
      setProgress((prev) =>
        prev ? { ...prev, percentComplete: 30, status: "processing" } : null
      );

      const variants = await generateImageVariants(
        file,
        metadata.width,
        metadata.height
      );

      const variantTypes = Array.from(variants.keys()) as VariantType[];
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              percentComplete: 50,
              variantsGenerating: variantTypes,
            }
          : null
      );

      // Create base media record
      const slug = file.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ""); // Trim hyphens

      const mediaRecord = await createMedia({
        name: file.name.replace(/\.[^/.]+$/, ""), // Name without extension
        slug,
        original_filename: file.name,
        original_format: metadata.format,
        original_size_bytes: file.size,
        original_width: metadata.width,
        original_height: metadata.height,
        mime_type: file.type,
      });

      // Upload variants to storage
      const uploadResults = await uploadVariantsToStorage(
        bucket,
        slug,
        variants
      );

      // Create variant records in database
      for (const [variantType, result] of uploadResults) {
        const variantData = variants.get(variantType);
        if (variantData) {
          await createMediaVariant({
            media_id: mediaRecord.id,
            variant_type: variantType,
            format: variantData.format,
            url: result.url,
            storage_path: result.storagePath,
            width: variantData.width,
            height: variantData.height,
            size_bytes: result.sizeBytes,
          });

          setProgress((prev) =>
            prev
              ? {
                  ...prev,
                  variantsComplete: [
                    ...prev.variantsComplete,
                    variantType,
                  ] as VariantType[],
                }
              : null
          );
        }
      }

      // Fetch complete media with variants
      const completeMedia = await getMediaById(mediaRecord.id);
      if (!completeMedia) {
        throw new Error("Failed to fetch uploaded media");
      }

      setProgress({
        fileName: file.name,
        totalSize: file.size,
        uploadedBytes: file.size,
        percentComplete: 100,
        variantsGenerating: [],
        variantsComplete: variantTypes,
        status: "complete",
      });

      // Success callback
      onUploadComplete?.(completeMedia);

      // Reset after 2 seconds
      setTimeout(() => {
        setProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 2000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Upload failed");
      onError?.(err);
      setProgress({
        fileName: file.name,
        totalSize: file.size,
        uploadedBytes: 0,
        percentComplete: 0,
        variantsGenerating: [],
        variantsComplete: [],
        status: "error",
        error: err.message,
      });
    }
  };

  const getStatusIcon = () => {
    if (!progress) return null;
    switch (progress.status) {
      case "complete":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case "uploading":
      case "processing":
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    if (!progress) return null;
    switch (progress.status) {
      case "uploading":
        return "Uploading...";
      case "processing":
        return "Processing variants...";
      case "complete":
        return "Upload complete!";
      case "error":
        return `Error: ${progress.error}`;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <Card
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-muted-foreground/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={progress !== null && progress.status !== "complete"}
        />

        {!progress ? (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drag and drop your image here</p>
              <p className="text-xs text-muted-foreground">or click to select</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Supported: JPG, PNG, GIF, BMP, TGA (max {(maxFileSize / 1024 / 1024).toFixed(0)}MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium truncate">{progress.fileName}</p>
              <p className="text-xs text-muted-foreground">{getStatusText()}</p>
            </div>

            {/* Progress Bar */}
            {progress.status !== "complete" && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress.percentComplete}%
                </p>
              </div>
            )}

            {/* Variant Status */}
            {(progress.variantsGenerating.length > 0 ||
              progress.variantsComplete.length > 0) && (
              <div className="text-left space-y-1">
                <p className="text-xs font-medium">Variants:</p>
                <div className="flex flex-wrap gap-1">
                  {progress.variantsComplete.map((variant) => (
                    <span
                      key={variant}
                      className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded"
                    >
                      ✓ {variant}
                    </span>
                  ))}
                  {progress.variantsGenerating.map((variant) => (
                    <span
                      key={variant}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                    >
                      ⟳ {variant}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Error Message */}
      {progress?.status === "error" && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {progress.error}
        </div>
      )}

      {/* File Info (after successful upload) */}
      {progress?.status === "complete" && (
        <Card className="p-4 bg-green-50 border-green-200 space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Upload Successful!</span>
          </div>
          <p className="text-xs text-green-600">
            {progress.variantsComplete.length} variants generated and stored
          </p>
        </Card>
      )}
    </div>
  );
}
