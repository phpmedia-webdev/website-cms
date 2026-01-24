/**
 * Media Library Supabase Utilities
 * Handles all database operations for media and variants
 */

import { createClientSupabaseClient } from './client';
import { getClientSchema } from './schema';
import {
  MediaAsset,
  MediaWithVariants,
  MediaCreatePayload,
  MediaUpdatePayload,
  VariantCreatePayload,
  MediaBulkResponse,
} from '@/types/media';

/**
 * Create a Supabase client for RPC calls
 * PostgREST searches for RPC functions in the client's configured schema
 * We use the same client as regular queries so PostgREST finds the wrapper functions
 * in the custom schema (which call the public schema functions internally)
 */
function createRpcClient() {
  // Use the same client as regular queries - PostgREST will search in the custom schema
  // where we've created wrapper functions that call the public schema functions
  return createClientSupabaseClient();
}

/**
 * Fetch all media with variants
 * Returns all media assets in the current schema with their variants
 */
export async function getMediaWithVariants(): Promise<MediaWithVariants[]> {
  try {
    // Use client with custom schema - PostgREST will find wrapper functions in custom schema
    const supabase = createRpcClient();

    // Query using the RPC function to get media with joined variants
    const { data, error } = await supabase.rpc('get_media_with_variants');

    if (error) {
      console.error('Error fetching media with variants:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error(
          'RPC function get_media_with_variants not found. Please run migrations 028 and 034 in Supabase SQL Editor.'
        );
      }
      if (error.message?.includes('permission denied')) {
        throw new Error(
          'Permission denied accessing media. Check RLS policies and RPC function permissions.'
        );
      }
      
      throw error;
    }

    // Transform RPC response to MediaWithVariants
    // Handle NULL variants (should be fixed by migration 031, but keep this as fallback)
    return (data || []).map((item) => ({
      id: item.media_id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      alt_text: item.alt_text,
      original_filename: item.original_filename,
      original_format: item.original_format,
      original_size_bytes: item.original_size_bytes,
      original_width: item.original_width,
      original_height: item.original_height,
      mime_type: item.mime_type,
      created_at: item.created_at,
      updated_at: item.updated_at,
      variants: Array.isArray(item.variants) ? item.variants : [],
    }));
  } catch (error) {
    console.error('Exception in getMediaWithVariants:', error);
    throw error;
  }
}

/**
 * Fetch single media by ID with all variants
 * Returns a single media asset with all its variants
 */
export async function getMediaById(mediaId: string): Promise<MediaWithVariants | null> {
  try {
    // Use client without schema config for RPC calls
    const supabase = createRpcClient();

    const { data, error } = await supabase
      .rpc('get_media_by_id', { media_id_param: mediaId })
      .returns<MediaBulkResponse[]>()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error fetching media by ID:', error);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.media_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      alt_text: data.alt_text,
      original_filename: data.original_filename,
      original_format: data.original_format,
      original_size_bytes: data.original_size_bytes,
      original_width: data.original_width,
      original_height: data.original_height,
      mime_type: data.mime_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
      variants: Array.isArray(data.variants) ? data.variants : [],
    };
  } catch (error) {
    console.error('Exception in getMediaById:', error);
    throw error;
  }
}

/**
 * Get media library statistics
 * Returns total count and total size of all media
 */
export async function getMediaStats(): Promise<{ totalCount: number; totalSizeBytes: number }> {
  try {
    const supabase = createClientSupabaseClient();

    // Query media table directly (client already has schema configured)
    const { count, error: countError } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error counting media:', countError);
      throw countError;
    }

    // Sum total size from all media
    const { data, error: sumError } = await supabase
      .from('media')
      .select('original_size_bytes');

    if (sumError) {
      console.error('Error summing media sizes:', sumError);
      throw sumError;
    }

    const totalSizeBytes = (data || []).reduce((sum, item) => sum + (item.original_size_bytes || 0), 0);

    return {
      totalCount: count || 0,
      totalSizeBytes,
    };
  } catch (error) {
    console.error('Exception in getMediaStats:', error);
    throw error;
  }
}

/**
 * Create a new media asset
 * Inserts a new media record and returns the created asset
 */
export async function createMedia(payload: MediaCreatePayload): Promise<MediaAsset> {
  try {
    const supabase = createClientSupabaseClient();

    const { data, error } = await supabase
      .from('media')
      .insert({
        name: payload.name,
        slug: payload.slug,
        description: payload.description || null,
        alt_text: payload.alt_text || null,
        original_filename: payload.original_filename,
        original_format: payload.original_format,
        original_size_bytes: payload.original_size_bytes,
        original_width: payload.original_width,
        original_height: payload.original_height,
        mime_type: payload.mime_type || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating media:', error);
      if (error.message?.includes('row-level security')) {
        throw new Error('RLS policy blocking media creation. Check RLS policies and ensure user is authenticated.');
      }
      if (error.message?.includes('does not exist')) {
        throw new Error(`Table media does not exist. Please run migration 026_create_media_with_variants.sql.`);
      }
      throw error;
    }

    if (!data) {
      throw new Error('Failed to create media: no data returned');
    }

    return data as MediaAsset;
  } catch (error) {
    console.error('Exception in createMedia:', error);
    throw error;
  }
}

/**
 * Create a media variant
 * Inserts a new variant record for an existing media asset
 */
export async function createMediaVariant(payload: VariantCreatePayload): Promise<void> {
  try {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase
      .from('media_variants')
      .insert({
        media_id: payload.media_id,
        variant_type: payload.variant_type,
        format: payload.format,
        url: payload.url,
        storage_path: payload.storage_path,
        width: payload.width,
        height: payload.height,
        size_bytes: payload.size_bytes,
      });

    if (error) {
      console.error('Error creating media variant:', error);
      if (error.message?.includes('row-level security')) {
        throw new Error('RLS policy blocking variant creation. Check RLS policies and ensure user is authenticated.');
      }
      if (error.message?.includes('does not exist')) {
        throw new Error(`Table media_variants does not exist. Please run migration 026_create_media_with_variants.sql.`);
      }
      throw error;
    }
  } catch (error) {
    console.error('Exception in createMediaVariant:', error);
    throw error;
  }
}

/**
 * Update media metadata
 * Updates name, slug, description, or alt_text of a media asset
 */
export async function updateMedia(
  mediaId: string,
  payload: MediaUpdatePayload
): Promise<MediaAsset> {
  try {
    const supabase = createClientSupabaseClient();

    const updateData: Partial<MediaCreatePayload> = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.slug !== undefined) updateData.slug = payload.slug;
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.alt_text !== undefined) updateData.alt_text = payload.alt_text || null;

    const { data, error } = await supabase
      .from('media')
      .update(updateData)
      .eq('id', mediaId)
      .select()
      .single();

    if (error) {
      console.error('Error updating media:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to update media: no data returned');
    }

    return data as MediaAsset;
  } catch (error) {
    console.error('Exception in updateMedia:', error);
    throw error;
  }
}

/**
 * Delete media asset and all its variants
 * Cascades to delete all variants due to foreign key constraint
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  try {
    const supabase = createClientSupabaseClient();

    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  } catch (error) {
    console.error('Exception in deleteMedia:', error);
    throw error;
  }
}

/**
 * Search media by name or slug
 * Returns media matching the search query
 */
export async function searchMedia(query: string): Promise<MediaWithVariants[]> {
  try {
    // Get all media and filter client-side for now
    // TODO: Implement server-side search via RPC if needed for performance
    const allMedia = await getMediaWithVariants();
    
    const searchLower = query.toLowerCase();
    return allMedia.filter(
      (media) =>
        media.name.toLowerCase().includes(searchLower) ||
        media.slug.toLowerCase().includes(searchLower) ||
        (media.description && media.description.toLowerCase().includes(searchLower))
    );
  } catch (error) {
    console.error('Exception in searchMedia:', error);
    throw error;
  }
}
