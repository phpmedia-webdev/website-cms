"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  extractFileMetadata,
  generateImageVariants,
  uploadVariantsToStorage,
  uploadVideoFileToStorage,
  validateFileBeforeUpload,
  validateVideoFile,
  ensureStorageBucket,
  isVideoFile,
  getVideoFormatFromFile,
} from "@/lib/media/storage";
import {
  createMedia,
  createMediaVariant,
  getMediaById,
} from "@/lib/supabase/media";
import { getClientBucket } from "@/lib/supabase/schema";
import { MediaWithVariants, UploadProgress, VariantType } from "@/types/media";

const IMAGE_ACCEPT = "image/*";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";
const ACCEPT = `${IMAGE_ACCEPT},${VIDEO_ACCEPT}`;

const IMAGE_MAX_MB = 10;
const VIDEO_MAX_MB = 100;

interface MediaFileUploadProps {
  onUploadComplete?: (media: MediaWithVariants) => void;
  onError?: (error: Error) => void;
}

export function MediaFileUpload({
  onUploadComplete,
  onError,
}: MediaFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setError = (fileName: string, totalSize: number, message: string) => {
    onError?.(new Error(message));
    setProgress({
      fileName,
      totalSize,
      uploadedBytes: 0,
      percentComplete: 0,
      variantsGenerating: [],
      variantsComplete: [],
      status: "error",
      error: message,
    });
  };

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
    if (files.length > 0) safeHandleFile(files[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) safeHandleFile(e.target.files[0]);
  };

  const handleFile = async (file: File) => {
    const video = isVideoFile(file);
    const maxBytes = video
      ? VIDEO_MAX_MB * 1024 * 1024
      : IMAGE_MAX_MB * 1024 * 1024;

    setProgress({
      fileName: file.name,
      totalSize: file.size,
      uploadedBytes: 0,
      percentComplete: 0,
      variantsGenerating: [],
      variantsComplete: [],
      status: "preparing",
    });
    await new Promise((r) => setTimeout(r, 0));

    const bucket = getClientBucket();
    try {
      await ensureStorageBucket(bucket);
    } catch (bucketErr) {
      const msg =
        bucketErr instanceof Error
          ? bucketErr.message
          : "Storage bucket verification failed";
      setError(file.name, file.size, msg);
      return;
    }

    if (video) {
      const validation = validateVideoFile(file, maxBytes);
      if (!validation.valid) {
        setError(file.name, file.size, validation.error ?? "Invalid video");
        return;
      }
      setProgress((p) => (p ? { ...p, percentComplete: 20, status: "uploading" } : null));
      const slug = file.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const { url } = await uploadVideoFileToStorage(bucket, slug, file);
      const ext = getVideoFormatFromFile(file);
      const mediaRecord = await createMedia({
        name: file.name.replace(/\.[^/.]+$/, ""),
        slug,
        original_filename: file.name,
        original_format: ext,
        original_size_bytes: file.size,
        original_width: null,
        original_height: null,
        mime_type: file.type,
        media_type: "video",
        video_url: url,
      });
      const complete = await getMediaById(mediaRecord.id);
      if (!complete) throw new Error("Failed to fetch uploaded video");
      setProgress({
        fileName: file.name,
        totalSize: file.size,
        uploadedBytes: file.size,
        percentComplete: 100,
        variantsGenerating: [],
        variantsComplete: [],
        status: "complete",
      });
      onUploadComplete?.(complete);
    } else {
      const validation = await validateFileBeforeUpload(file, maxBytes);
      if (!validation.valid) {
        setError(file.name, file.size, validation.error ?? "Invalid file");
        return;
      }
      setProgress((p) => (p ? { ...p, percentComplete: 10, status: "uploading" } : null));
      const metadata = await extractFileMetadata(file);
      setProgress((p) => (p ? { ...p, percentComplete: 30, status: "processing" } : null));
      const variants = await generateImageVariants(
        file,
        metadata.width,
        metadata.height
      );
      const variantTypes = Array.from(variants.keys()) as VariantType[];
      setProgress((p) =>
        p ? { ...p, percentComplete: 50, variantsGenerating: variantTypes } : null
      );
      const slug = file.name
        .toLowerCase()
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const mediaRecord = await createMedia({
        name: file.name.replace(/\.[^/.]+$/, ""),
        slug,
        original_filename: file.name,
        original_format: metadata.format,
        original_size_bytes: file.size,
        original_width: metadata.width,
        original_height: metadata.height,
        mime_type: file.type,
      });
      const uploadResults = await uploadVariantsToStorage(bucket, slug, variants);
      for (const [variantType, result] of uploadResults) {
        const v = variants.get(variantType);
        if (v) {
          await createMediaVariant({
            media_id: mediaRecord.id,
            variant_type: variantType,
            format: v.format,
            url: result.url,
            storage_path: result.storagePath,
            width: v.width,
            height: v.height,
            size_bytes: result.sizeBytes,
          });
          setProgress((p) =>
            p
              ? {
                  ...p,
                  variantsComplete: [...p.variantsComplete, variantType] as VariantType[],
                }
              : null
          );
        }
      }
      const complete = await getMediaById(mediaRecord.id);
      if (!complete) throw new Error("Failed to fetch uploaded media");
      setProgress({
        fileName: file.name,
        totalSize: file.size,
        uploadedBytes: file.size,
        percentComplete: 100,
        variantsGenerating: [],
        variantsComplete: variantTypes,
        status: "complete",
      });
      onUploadComplete?.(complete);
    }

    setTimeout(() => {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }, 2000);
  };

  const catchErr = (err: unknown) => {
    const message = err instanceof Error ? err.message : "Upload failed";
    onError?.(err instanceof Error ? err : new Error(message));
    setProgress((p) =>
      p
        ? {
            ...p,
            status: "error",
            error: message,
            variantsGenerating: [],
            variantsComplete: [],
          }
        : null
    );
  };

  // Wrap handleFile so we catch and display errors
  const safeHandleFile = (file: File) => {
    handleFile(file).catch(catchErr);
  };

  const getStatusIcon = () => {
    if (!progress) return null;
    switch (progress.status) {
      case "complete":
        return <CheckCircle2 className="h-8 w-8 text-green-500" />;
      case "error":
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
    }
  };

  const getStatusText = () => {
    if (!progress) return null;
    switch (progress.status) {
      case "preparing":
        return "Preparing…";
      case "uploading":
        return "Uploading…";
      case "processing":
        return "Processing variants…";
      case "complete":
        return "Upload complete!";
      case "error":
        return `Error: ${progress.error}`;
      default:
        return null;
    }
  };

  const showVariants =
    progress &&
    (progress.variantsGenerating.length > 0 || progress.variantsComplete.length > 0);

  return (
    <div className="space-y-4">
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
          accept={ACCEPT}
          onChange={handleInputChange}
          className="hidden"
          disabled={progress !== null && progress.status !== "complete"}
        />
        {!progress ? (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Drag and drop images or video here</p>
            <p className="text-xs text-muted-foreground">or click to select</p>
            <p className="text-xs text-muted-foreground">
              Images: JPG, PNG, GIF, BMP, TGA (max {IMAGE_MAX_MB}MB) · Video: MP4, WebM, MOV (max {VIDEO_MAX_MB}MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium truncate">{progress.fileName}</p>
              <p className="text-xs text-muted-foreground">{getStatusText()}</p>
            </div>
            {progress.status !== "complete" && (
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress.percentComplete}%</p>
              </div>
            )}
            {showVariants && (
              <div className="text-left space-y-1">
                <p className="text-xs font-medium">Variants:</p>
                <div className="flex flex-wrap gap-1">
                  {progress.variantsComplete.map((v) => (
                    <span key={v} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      ✓ {v}
                    </span>
                  ))}
                  {progress.variantsGenerating.map((v) => (
                    <span key={v} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      ⟳ {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
      {progress?.status === "error" && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {progress.error}
        </div>
      )}
      {progress?.status === "complete" && (
        <Card className="p-4 bg-green-50 border-green-200 space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Upload successful!</span>
          </div>
          {showVariants && (
            <p className="text-xs text-green-600">
              {progress.variantsComplete.length} variants generated and stored
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
