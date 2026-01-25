/**
 * Media Library Supabase Utilities
 * Handles all database operations for media and variants
 */

import { createClientSupabaseClient } from './client';
import { getClientBucket, getClientSchema } from './schema';
import { deleteFilesFromStorage } from '@/lib/media/storage';
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
      const schema = getClientSchema();
      console.error(`Error fetching media with variants [schema: ${schema}]:`, error);
      
      // Provide helpful error messages
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error(
          'RPC function get_media_with_variants not found. Please run migration 038 in Supabase SQL Editor.'
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
      media_type: (item.media_type ?? 'image') as 'image' | 'video',
      video_url: item.video_url ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      variants: Array.isArray(item.variants) ? item.variants : [],
    }));
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in getMediaWithVariants [schema: ${schema}]:`, error);
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
      const schema = getClientSchema();
      console.error(`Error fetching media by ID [schema: ${schema}]:`, error);
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
      media_type: (data.media_type ?? 'image') as 'image' | 'video',
      video_url: data.video_url ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      variants: Array.isArray(data.variants) ? data.variants : [],
    };
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in getMediaById [schema: ${schema}]:`, error);
    throw error;
  }
}

/**
 * Get media library statistics
 * Returns total count and total size of all media
 * Uses RPC function for reliable schema access
 */
export async function getMediaStats(): Promise<{ totalCount: number; totalSizeBytes: number }> {
  try {
    const supabase = createRpcClient();
    const schema = getClientSchema();

    // Use RPC function for statistics (more reliable than direct table access)
    const { data, error } = await supabase.rpc('get_media_stats').single();

    if (error) {
      console.error(`Error fetching media stats [schema: ${schema}]:`, error);
      
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error(
          'RPC function get_media_stats not found. Please run migration 038 in Supabase SQL Editor.'
        );
      }
      if (error.message?.includes('permission denied')) {
        throw new Error(
          'Permission denied accessing media stats. Check RLS policies and RPC function permissions.'
        );
      }
      
      throw error;
    }

    if (!data) {
      return {
        totalCount: 0,
        totalSizeBytes: 0,
      };
    }

    return {
      totalCount: Number(data.total_count) || 0,
      totalSizeBytes: Number(data.total_size_bytes) || 0,
    };
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in getMediaStats [schema: ${schema}]:`, error);
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
        media_type: payload.media_type ?? 'image',
        video_url: payload.video_url ?? null,
      })
      .select()
      .single();

    if (error) {
      const schema = getClientSchema();
      console.error(`Error creating media [schema: ${schema}]:`, error);
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
    const schema = getClientSchema();
    console.error(`Exception in createMedia [schema: ${schema}]:`, error);
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
      const schema = getClientSchema();
      console.error(`Error creating media variant [schema: ${schema}]:`, error);
      if (error.message?.includes('row-level security')) {
        throw new Error('RLS policy blocking variant creation. Check RLS policies and ensure user is authenticated.');
      }
      if (error.message?.includes('does not exist')) {
        throw new Error(`Table media_variants does not exist. Please run migration 026_create_media_with_variants.sql.`);
      }
      throw error;
    }
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in createMediaVariant [schema: ${schema}]:`, error);
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
      const schema = getClientSchema();
      console.error(`Error updating media [schema: ${schema}]:`, error);
      throw error;
    }

    if (!data) {
      throw new Error('Failed to update media: no data returned');
    }

    return data as MediaAsset;
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in updateMedia [schema: ${schema}]:`, error);
    throw error;
  }
}

/**
 * Delete media asset and all its variants
 * Removes storage files first, then deletes DB records (cascade removes variants).
 * Storage cleanup prevents "The resource already exists" when re-uploading the same file.
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  try {
    const media = await getMediaById(mediaId);
    const bucket = getClientBucket();

    if (media?.variants?.length) {
      const storagePaths = media.variants
        .map((v) => (v as { storage_path?: string }).storage_path)
        .filter((p): p is string => Boolean(p));
      if (storagePaths.length) {
        await deleteFilesFromStorage(bucket, storagePaths);
      }
    }

    const supabase = createClientSupabaseClient();
    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      const schema = getClientSchema();
      console.error(`Error deleting media [schema: ${schema}]:`, error);
      throw error;
    }
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in deleteMedia [schema: ${schema}]:`, error);
    throw error;
  }
}

/**
 * Search media by name, slug, or description
 * Returns media matching the search query
 * Uses server-side RPC function for better performance
 */
export async function searchMedia(query: string): Promise<MediaWithVariants[]> {
  try {
    const supabase = createRpcClient();
    const schema = getClientSchema();

    // Use RPC function for server-side search (more efficient than client-side filtering)
    const { data, error } = await supabase.rpc('search_media', {
      search_query: query,
    });

    if (error) {
      console.error(`Error searching media [schema: ${schema}]:`, error);
      
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error(
          'RPC function search_media not found. Please run migration 038 in Supabase SQL Editor.'
        );
      }
      if (error.message?.includes('permission denied')) {
        throw new Error(
          'Permission denied searching media. Check RLS policies and RPC function permissions.'
        );
      }
      
      throw error;
    }

    // Transform RPC response to MediaWithVariants
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
      media_type: (item.media_type ?? 'image') as 'image' | 'video',
      video_url: item.video_url ?? null,
      created_at: item.created_at,
      updated_at: item.updated_at,
      variants: Array.isArray(item.variants) ? item.variants : [],
    }));
  } catch (error) {
    const schema = getClientSchema();
    console.error(`Exception in searchMedia [schema: ${schema}]:`, error);
    throw error;
  }
}
