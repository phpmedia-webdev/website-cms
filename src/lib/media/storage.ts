/**
 * Storage and Upload Utilities
 * Handles file uploads, variant generation, and storage operations
 */

import { createClientSupabaseClient } from '@/lib/supabase/client';
import { getClientBucket } from '@/lib/supabase/schema';
import {
  VariantType,
  ImageFormat,
  VariantGenerationResult,
  StoragePathInfo,
  FileUploadMetadata,
} from '@/types/media';
import {
  getVariantsToGenerate,
  calculateVariantDimensions,
  generateStoragePath,
  VARIANT_CONFIGS,
} from './image-optimizer';

/**
 * Extract file metadata from File object
 * Gets dimensions by reading the file as image
 */
export async function extractFileMetadata(file: File): Promise<FileUploadMetadata> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const format = file.type.split('/')[1].toLowerCase() as ImageFormat;
        resolve({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          width: img.width,
          height: img.height,
          format: (format === 'jpeg' ? 'jpg' : format) as ImageFormat,
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to read image dimensions'));
      };
      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate image variants from original file
 * Creates WebP variants of different sizes
 * Uses Canvas API for image processing
 */
export async function generateImageVariants(
  originalFile: File,
  originalWidth: number,
  originalHeight: number
): Promise<Map<VariantType, VariantGenerationResult>> {
  const variants = new Map<VariantType, VariantGenerationResult>();

  // Always add original as-is
  variants.set('original', {
    variantType: 'original',
    blob: originalFile,
    width: originalWidth,
    height: originalHeight,
    sizeBytes: originalFile.size,
    format: (originalFile.type.split('/')[1].toLowerCase() as ImageFormat) || 'jpg',
  });

  // Get which variants to generate
  const variantsToGenerate = getVariantsToGenerate(originalWidth, originalHeight);

  // Generate each variant
  for (const variantType of variantsToGenerate) {
    if (variantType === 'original') continue; // Already added

    try {
      const variantBlob = await generateSingleVariant(
        originalFile,
        originalWidth,
        originalHeight,
        variantType
      );

      // Get new dimensions
      const newDimensions = calculateVariantDimensions(
        { width: originalWidth, height: originalHeight },
        variantType
      );

      variants.set(variantType, {
        variantType,
        blob: variantBlob,
        width: newDimensions.width,
        height: newDimensions.height,
        sizeBytes: variantBlob.size,
        format: 'webp',
      });
    } catch (error) {
      console.error(`Error generating ${variantType} variant:`, error);
      // Continue with other variants if one fails
    }
  }

  return variants;
}

/**
 * Generate a single variant from original file
 * Private helper for generateImageVariants
 */
async function generateSingleVariant(
  originalFile: File,
  originalWidth: number,
  originalHeight: number,
  variantType: VariantType
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Read original file as Data URL
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas and context
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate dimensions for variant
        const targetDimensions = calculateVariantDimensions(
          { width: originalWidth, height: originalHeight },
          variantType
        );

        canvas.width = targetDimensions.width;
        canvas.height = targetDimensions.height;

        // Draw image on canvas (browser handles resizing)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert canvas to WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            resolve(blob);
          },
          'image/webp',
          VARIANT_CONFIGS[variantType].quality / 100 // Convert 0-100 to 0-1
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for variant generation'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read original file'));
    };

    reader.readAsDataURL(originalFile);
  });
}

/**
 * Verify storage bucket exists
 * Ensures bucket is available before upload
 */
export async function ensureStorageBucket(bucket: string): Promise<void> {
  try {
    const supabase = createClientSupabaseClient();

    // Try to list bucket (will fail if bucket doesn't exist)
    const { error: listError } = await supabase.storage.from(bucket).list('', {
      limit: 1,
    });

    if (listError) {
      // Bucket doesn't exist - this is expected for new clients
      // Note: Bucket creation requires service role or manual creation in Supabase Dashboard
      throw new Error(
        `Storage bucket "${bucket}" does not exist. Please create it in Supabase Dashboard → Storage.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not exist')) {
      throw error; // Re-throw our custom error
    }
    console.error('Error verifying storage bucket:', error);
    throw new Error(`Failed to verify storage bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload file to Supabase storage
 * Handles individual file uploads
 */
export async function uploadFileToStorage(
  bucket: string,
  storagePath: string,
  file: Blob
): Promise<string> {
  try {
    const supabase = createClientSupabaseClient();

    // Verify bucket exists first
    await ensureStorageBucket(bucket);

    // Upload file
    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        cacheControl: '31536000', // 1 year
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Provide more helpful error messages
      if (uploadError.message?.includes('Bucket not found')) {
        throw new Error(`Storage bucket "${bucket}" not found. Please create it in Supabase Dashboard → Storage.`);
      }
      if (uploadError.message?.includes('new row violates row-level security')) {
        throw new Error('Storage upload blocked by RLS policy. Check bucket permissions in Supabase Dashboard.');
      }
      throw uploadError;
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Exception in uploadFileToStorage:', error);
    throw error;
  }
}

/**
 * Upload multiple variant blobs to storage
 * Batch upload all variants for an image
 */
export async function uploadVariantsToStorage(
  bucket: string,
  mediaSlug: string,
  variants: Map<VariantType, VariantGenerationResult>
): Promise<
  Map<
    VariantType,
    {
      url: string;
      storagePath: string;
      sizeBytes: number;
    }
  >
> {
  const uploadResults = new Map<
    VariantType,
    { url: string; storagePath: string; sizeBytes: number }
  >();

  // Upload each variant
  for (const [variantType, variant] of variants) {
    try {
      const format = variantType === 'original' ? variant.format : 'webp';
      const storagePath = generateStoragePath(mediaSlug, variantType, format);

      const url = await uploadFileToStorage(bucket, storagePath, variant.blob);

      uploadResults.set(variantType, {
        url,
        storagePath,
        sizeBytes: variant.sizeBytes,
      });
    } catch (error) {
      console.error(`Error uploading ${variantType} variant:`, error);
      // Continue with other variants if one fails
    }
  }

  return uploadResults;
}

/**
 * Get signed URL for storage file
 * Useful for private files or short-term access
 */
export async function getSignedUrl(
  bucket: string,
  storagePath: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  try {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    throw error;
  }
}

/**
 * Delete file from storage
 */
export async function deleteFileFromStorage(bucket: string, storagePath: string): Promise<void> {
  try {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase.storage.from(bucket).remove([storagePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    throw error;
  }
}

/**
 * Delete multiple files from storage
 * Batch delete variants
 */
export async function deleteFilesFromStorage(
  bucket: string,
  storagePaths: string[]
): Promise<void> {
  try {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase.storage.from(bucket).remove(storagePaths);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting files from storage:', error);
    throw error;
  }
}

/**
 * Validate file before upload
 * Checks file type, size, and dimensions
 */
export async function validateFileBeforeUpload(
  file: File,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB
): Promise<{ valid: boolean; error?: string }> {
  // Check file type
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/x-tga'];
  if (!allowedMimes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${file.type}. Allowed: JPG, PNG, GIF, BMP, TGA`,
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxMB = maxSizeBytes / (1024 * 1024);
    const fileMB = file.size / (1024 * 1024);
    return {
      valid: false,
      error: `File too large: ${fileMB.toFixed(1)}MB. Maximum: ${maxMB.toFixed(0)}MB`,
    };
  }

  // Check dimensions by reading as image
  try {
    const metadata = await extractFileMetadata(file);

    if (metadata.width < 50 || metadata.height < 50) {
      return {
        valid: false,
        error: `Image too small: ${metadata.width}x${metadata.height}px. Minimum: 50x50px`,
      };
    }

    if (metadata.width > 8000 || metadata.height > 8000) {
      return {
        valid: false,
        error: `Image too large: ${metadata.width}x${metadata.height}px. Maximum: 8000x8000px`,
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  return { valid: true };
}

/**
 * List files in storage bucket
 * Useful for debugging and management
 */
export async function listStorageFiles(
  bucket: string,
  path: string = 'media'
): Promise<any[]> {
  try {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase.storage.from(bucket).list(path, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error listing storage files:', error);
    throw error;
  }
}
