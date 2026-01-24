"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { getClientBucket } from "@/lib/supabase/schema";
import { Upload, X, AlertTriangle, CheckCircle2 } from "lucide-react";

// Image size and dimension thresholds
const OPTIMAL_SIZE = 200 * 1024; // 200KB
const WARNING_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 2500; // pixels (warning threshold)
const HARD_DIMENSION_LIMIT = 5000; // pixels (hard limit)

interface MediaUploadProps {
  onUploadComplete?: (mediaId: string) => void;
  accept?: string;
}

interface FileValidation {
  isValid: boolean;
  canUpload: boolean;
  sizeWarning: string | null;
  dimensionWarning: string | null;
  sizeError: string | null;
  dimensionError: string | null;
}

export function MediaUpload({ onUploadComplete, accept = "image/*" }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [validation, setValidation] = useState<FileValidation | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const validateFile = async (file: File): Promise<FileValidation> => {
    const fileSize = file.size;
    let width: number | null = null;
    let height: number | null = null;
    let sizeWarning: string | null = null;
    let dimensionWarning: string | null = null;
    let sizeError: string | null = null;
    let dimensionError: string | null = null;
    let canUpload = true;

    // Validate file size
    if (fileSize > MAX_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      sizeError = `File too large (${sizeMB} MB). Maximum size: 10MB. Please optimize before uploading.`;
      canUpload = false;
    } else if (fileSize > WARNING_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      sizeWarning = `Large file (${sizeMB} MB). Consider optimizing for faster page loads.`;
    } else if (fileSize < OPTIMAL_SIZE) {
      // Optimal size - no warning needed
    }

    // Get image dimensions if it's an image
    if (file.type.startsWith("image/")) {
      try {
        const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            resolve({ width: img.width, height: img.height });
          };
          img.onerror = reject;
          img.src = URL.createObjectURL(file);
        });

        width = dimensions.width;
        height = dimensions.height;
        setImageDimensions(dimensions);

        // Validate dimensions
        if (width > HARD_DIMENSION_LIMIT || height > HARD_DIMENSION_LIMIT) {
          dimensionError = `Image dimensions too large (${width}×${height}px). Maximum: 5000×5000px. Please resize before uploading.`;
          canUpload = false;
        } else if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          dimensionWarning = `Large dimensions (${width}×${height}px). Consider resizing for better performance.`;
        }
      } catch (error) {
        console.error("Error reading image dimensions:", error);
      }
    }

    return {
      isValid: !sizeError && !dimensionError,
      canUpload,
      sizeWarning,
      dimensionWarning,
      sizeError,
      dimensionError,
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Reset previous validation
    setValidation(null);
    setImageDimensions(null);

    // Validate file
    const validationResult = await validateFile(selectedFile);
    setValidation(validationResult);

    // Only set file and preview if validation passes (or has warnings but can upload)
    if (validationResult.canUpload) {
      setFile(selectedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      // Show error alert
      const errorMessages = [
        validationResult.sizeError,
        validationResult.dimensionError,
      ].filter(Boolean);
      alert(errorMessages.join("\n"));
    }
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
    setValidation(null);
    setImageDimensions(null);
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
          
          {/* File info and validation messages */}
          {file && (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>File: {file.name}</span>
                  <span>{(file.size / 1024).toFixed(1)} KB</span>
                </div>
                {imageDimensions && (
                  <div className="flex items-center justify-between">
                    <span>Dimensions:</span>
                    <span>{imageDimensions.width} × {imageDimensions.height}px</span>
                  </div>
                )}
              </div>

              {/* Validation warnings and errors */}
              {validation && (
                <div className="space-y-1">
                  {validation.sizeError && (
                    <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{validation.sizeError}</span>
                    </div>
                  )}
                  {validation.dimensionError && (
                    <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{validation.dimensionError}</span>
                    </div>
                  )}
                  {validation.sizeWarning && !validation.sizeError && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{validation.sizeWarning}</span>
                    </div>
                  )}
                  {validation.dimensionWarning && !validation.dimensionError && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{validation.dimensionWarning}</span>
                    </div>
                  )}
                  {!validation.sizeWarning && 
                   !validation.dimensionWarning && 
                   !validation.sizeError && 
                   !validation.dimensionError && 
                   file.size < OPTIMAL_SIZE && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>Optimal file size for web performance</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                disabled={uploading || (validation && !validation.canUpload)}
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
