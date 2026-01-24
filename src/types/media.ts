/**
 * Media Library Types
 * Defines types for media assets and their optimized variants
 */

/**
 * Variant types supported by the media system
 * - 'original': Original uploaded file (preserves user's format)
 * - 'thumbnail': 150x150 - small preview
 * - 'small': 500px width - mobile/preview
 * - 'medium': 1000px width - standard display
 * - 'large': 1500px width - featured/hero display
 */
export type VariantType = 'original' | 'thumbnail' | 'small' | 'medium' | 'large';

/**
 * Image format types
 * - Original formats: jpg, png, bmp, tga, etc.
 * - Variant format: webp (always for variants except original)
 */
export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'gif' | 'bmp' | 'tga' | 'webp';

/**
 * Single image variant record
 * Represents an optimized version of a media asset
 */
export interface MediaVariant {
  id: string;
  media_id: string;
  variant_type: VariantType;
  format: ImageFormat;
  url: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
}

/**
 * Base media asset
 * Represents the original uploaded file and metadata
 */
export interface MediaAsset {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  alt_text: string | null;
  
  // Original file info (archived)
  original_filename: string;
  original_format: ImageFormat;
  original_size_bytes: number;
  original_width: number | null;
  original_height: number | null;
  
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Media asset with all variants joined
 * Complete representation of a media item with all its optimized versions
 */
export interface MediaWithVariants extends MediaAsset {
  variants: MediaVariant[];
}

/**
 * Upload progress tracking
 * Used to track the status of an image upload/variant generation
 */
export interface UploadProgress {
  fileName: string;
  totalSize: number;
  uploadedBytes: number;
  percentComplete: number;
  variantsGenerating: VariantType[];
  variantsComplete: VariantType[];
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

/**
 * Image dimensions
 * Simple type for width/height
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Variant configuration
 * Specifies dimensions and requirements for each variant type
 */
export interface VariantConfig {
  type: VariantType;
  targetWidth: number;
  targetHeight?: number; // null = maintain aspect ratio
  quality?: number; // 0-100, only for WebP conversion
  format: ImageFormat;
}

/**
 * Bulk media response (from RPC query)
 * Returned when fetching all media with variants
 */
export interface MediaBulkResponse {
  media_id: string;
  name: string;
  slug: string;
  description: string | null;
  alt_text: string | null;
  original_filename: string;
  original_format: ImageFormat;
  original_size_bytes: number;
  original_width: number | null;
  original_height: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  variants: MediaVariant[];
}

/**
 * Media create payload
 * Used when creating a new media asset
 */
export interface MediaCreatePayload {
  name: string;
  slug: string;
  description?: string;
  alt_text?: string;
  original_filename: string;
  original_format: ImageFormat;
  original_size_bytes: number;
  original_width: number | null;
  original_height: number | null;
  mime_type?: string;
}

/**
 * Media update payload
 * Metadata that can be updated after upload
 */
export interface MediaUpdatePayload {
  name?: string;
  slug?: string;
  description?: string;
  alt_text?: string;
}

/**
 * Variant creation payload
 * Used when adding a variant to existing media
 */
export interface VariantCreatePayload {
  media_id: string;
  variant_type: VariantType;
  format: ImageFormat;
  url: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
}

/**
 * File upload metadata
 * Extracted from user-selected file
 */
export interface FileUploadMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number;
  height: number;
  format: ImageFormat;
}

/**
 * Variant generation result
 * Result of processing an image into variants
 */
export interface VariantGenerationResult {
  variantType: VariantType;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  format: ImageFormat;
}

/**
 * Storage path builder result
 * Complete information for storing a file
 */
export interface StoragePathInfo {
  storagePath: string;
  publicUrl: string;
  signedUrl?: string; // If using signed URLs
  expiresIn?: number; // Expiration time in seconds
}

/**
 * Media library filter options
 * Used for searching and filtering media
 */
export interface MediaFilterOptions {
  search?: string; // Search by name or slug
  sortBy?: 'name' | 'created_at' | 'size';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Media library state
 * Complete state for media management component
 */
export interface MediaLibraryState {
  media: MediaWithVariants[];
  loading: boolean;
  error: string | null;
  selectedMediaId: string | null;
  uploadProgress: UploadProgress | null;
}
