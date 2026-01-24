/**
 * Image Optimizer
 * Handles variant generation logic and image processing configuration
 * Determines which variants to generate based on original image dimensions
 */

import { VariantType, ImageFormat, VariantConfig, ImageDimensions } from '@/types/media';

/**
 * Variant dimension configurations
 * Defines target dimensions for each variant type
 */
export const VARIANT_CONFIGS: Record<VariantType, VariantConfig> = {
  original: {
    type: 'original',
    targetWidth: 0, // No resizing for original
    format: 'jpg', // Will be replaced with actual original format
    quality: 90,
  },
  thumbnail: {
    type: 'thumbnail',
    targetWidth: 150,
    targetHeight: 150, // Square thumbnail
    format: 'webp',
    quality: 85,
  },
  small: {
    type: 'small',
    targetWidth: 500,
    // targetHeight: undefined, // Maintain aspect ratio
    format: 'webp',
    quality: 85,
  },
  medium: {
    type: 'medium',
    targetWidth: 1000,
    // targetHeight: undefined,
    format: 'webp',
    quality: 80,
  },
  large: {
    type: 'large',
    targetWidth: 1500,
    // targetHeight: undefined,
    format: 'webp',
    quality: 80,
  },
};

/**
 * Size thresholds
 * Determines minimum dimensions required to generate a variant
 */
const VARIANT_THRESHOLDS: Record<VariantType, number> = {
  original: 0, // Always include
  thumbnail: 100, // Need at least 100px width
  small: 300, // Need at least 300px width (want 500px, so min is ~3/5 of that)
  medium: 600, // Need at least 600px width
  large: 1000, // Need at least 1000px width
};

/**
 * Determine which variants should be generated for an image
 * Based on original dimensions, decides which optimized versions to create
 * 
 * Examples:
 * - 400x300 → [thumbnail, small] (too small for medium/large)
 * - 800x600 → [thumbnail, small, medium] (can do up to medium)
 * - 2000x1500 → [thumbnail, small, medium, large] (can do all)
 */
export function getVariantsToGenerate(
  originalWidth: number,
  originalHeight: number
): VariantType[] {
  const variants: VariantType[] = [];

  // Always include original
  variants.push('original');

  // Thumbnail is always generated (smallest)
  variants.push('thumbnail');

  // Check other variants based on original width
  if (originalWidth >= VARIANT_THRESHOLDS.small) {
    variants.push('small');
  }

  if (originalWidth >= VARIANT_THRESHOLDS.medium) {
    variants.push('medium');
  }

  if (originalWidth >= VARIANT_THRESHOLDS.large) {
    variants.push('large');
  }

  return variants;
}

/**
 * Calculate target dimensions for a variant
 * Maintains aspect ratio if no target height specified
 * Crops to square if target height equals target width (for thumbnail)
 */
export function calculateVariantDimensions(
  originalDimensions: ImageDimensions,
  variantType: VariantType
): ImageDimensions {
  const config = VARIANT_CONFIGS[variantType];

  if (variantType === 'original') {
    // Original dimensions unchanged
    return originalDimensions;
  }

  const { targetWidth, targetHeight } = config;

  if (!targetHeight) {
    // Maintain aspect ratio: calculate height from width
    const ratio = originalDimensions.height / originalDimensions.width;
    return {
      width: targetWidth,
      height: Math.round(targetWidth * ratio),
    };
  }

  if (targetHeight === targetWidth) {
    // Square crop (for thumbnail)
    // Use the smaller dimension as the base
    const size = Math.min(originalDimensions.width, originalDimensions.height);
    return {
      width: Math.min(size, targetWidth),
      height: Math.min(size, targetWidth),
    };
  }

  // Both dimensions specified
  return {
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Generate storage path for a media variant
 * Pattern: media/{slug}__{variantType}.{format}
 * Example: media/my-photo__thumbnail.webp
 */
export function generateStoragePath(
  mediaSlug: string,
  variantType: VariantType,
  format: ImageFormat
): string {
  if (variantType === 'original') {
    // Original preserves its original filename
    return `media/${mediaSlug}.${format}`;
  }

  return `media/${mediaSlug}__${variantType}.webp`;
}

/**
 * Validate image dimensions
 * Ensures minimum dimensions for useful processing
 */
export function validateImageDimensions(
  width: number,
  height: number
): { valid: boolean; error?: string } {
  const MIN_DIMENSION = 50;

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return {
      valid: false,
      error: `Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px. Got ${width}x${height}px.`,
    };
  }

  const MAX_DIMENSION = 8000;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return {
      valid: false,
      error: `Image too large. Maximum dimensions: ${MAX_DIMENSION}x${MAX_DIMENSION}px. Got ${width}x${height}px.`,
    };
  }

  return { valid: true };
}

/**
 * Get file size category (for UI display)
 * Helps users understand file sizes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Calculate compression ratio
 * Useful for showing optimization benefit
 */
export function calculateCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
}

/**
 * Estimate total storage for all variants
 * Used for storage quota calculations
 */
export function estimateTotalStorage(
  originalSizeBytes: number,
  originalWidth: number,
  originalHeight: number
): number {
  const variantsToGenerate = getVariantsToGenerate(originalWidth, originalHeight);

  // Very rough estimate: each variant is roughly original * (new_size / original_size) ^ 2
  // For now, use simplified estimate:
  // - thumbnail: ~5% of original
  // - small: ~20% of original
  // - medium: ~40% of original
  // - large: ~60% of original
  const estimates: Record<VariantType, number> = {
    original: originalSizeBytes,
    thumbnail: Math.round(originalSizeBytes * 0.05),
    small: Math.round(originalSizeBytes * 0.2),
    medium: Math.round(originalSizeBytes * 0.4),
    large: Math.round(originalSizeBytes * 0.6),
  };

  return variantsToGenerate.reduce((total, variant) => total + (estimates[variant] || 0), 0);
}

/**
 * Get variant config for a specific variant type
 */
export function getVariantConfig(variantType: VariantType): VariantConfig {
  return VARIANT_CONFIGS[variantType];
}

/**
 * Check if a variant type requires square crop
 */
export function requiresSquareCrop(variantType: VariantType): boolean {
  const config = VARIANT_CONFIGS[variantType];
  return config.targetHeight !== undefined && config.targetHeight === config.targetWidth;
}
