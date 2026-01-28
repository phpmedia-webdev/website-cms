/**
 * Content model helpers. Uses dynamic RPCs for reads; direct .from("content") for writes.
 * Content tables and seed data live in website_cms_template_dev (migrations 041–044).
 * We always use that schema for content so types/list/create work; other features use
 * getClientSchema() for tenant-specific schema.
 */

import { createClientSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/client";
import type { ContentType, ContentListItem, ContentRow, ContentTypeField } from "@/types/content";

const CONTENT_SCHEMA =
  process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

export async function getContentTypes(): Promise<ContentType[]> {
  const supabase = createClientSupabaseClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc("get_content_types_dynamic", {
    schema_name: CONTENT_SCHEMA,
  });
  if (!rpcError && rpcData) {
    return (rpcData as ContentType[]) ?? [];
  }
  if (rpcError) {
    console.warn("getContentTypes RPC failed, trying direct query:", {
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
    });
  }

  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_types")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    console.error("getContentTypes direct query failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return [];
  }
  return (data as ContentType[]) ?? [];
}

export async function insertContentType(row: {
  slug: string;
  label: string;
  description?: string | null;
}): Promise<{ id: string } | null> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_types")
    .insert({
      slug: row.slug.trim(),
      label: row.label.trim(),
      description: row.description?.trim() || null,
      is_core: false,
      display_order: 0,
    })
    .select("id")
    .single();
  if (error) {
    console.error("insertContentType:", error);
    return null;
  }
  return data as { id: string };
}

export async function updateContentType(
  id: string,
  row: Partial<{ slug: string; label: string; description: string | null; is_core: boolean; display_order: number }>
): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_types")
    .update(row)
    .eq("id", id);
  if (error) {
    console.error("updateContentType:", error);
    return false;
  }
  return true;
}

export async function deleteContentType(id: string): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase.schema(CONTENT_SCHEMA).from("content_types").delete().eq("id", id);
  if (error) {
    console.error("deleteContentType:", error);
    return false;
  }
  return true;
}

export async function getContentListWithTypes(): Promise<ContentListItem[]> {
  const supabase = createClientSupabaseClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc("get_content_list_with_types_dynamic", {
    schema_name: CONTENT_SCHEMA,
  });
  if (!rpcError && rpcData) {
    return (rpcData as ContentListItem[]) ?? [];
  }
  if (rpcError) {
    console.warn("getContentListWithTypes RPC failed, trying direct query:", {
      message: rpcError.message,
      code: rpcError.code,
    });
  }

  type Rel = { slug: string; label: string };
  type Row = { id: string; content_type_id: string; title: string; slug: string; status: string; updated_at: string; content_types: Rel | Rel[] | null };
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content")
    .select("id, content_type_id, title, slug, status, updated_at, content_types!content_type_id(slug, label)")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("getContentListWithTypes direct query failed:", { message: error.message, code: error.code });
    return [];
  }
  const rows = (data as Row[]) ?? [];
  return rows.map((r) => {
    const ct = Array.isArray(r.content_types) ? r.content_types[0] : r.content_types;
    return {
      id: r.id,
      content_type_id: r.content_type_id,
      type_slug: ct?.slug ?? "",
      type_label: ct?.label ?? "",
      title: r.title,
      slug: r.slug,
      status: r.status,
      updated_at: r.updated_at,
    };
  });
}

export async function getContentById(id: string): Promise<ContentRow | null> {
  const supabase = createClientSupabaseClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc("get_content_by_id_dynamic", {
    schema_name: CONTENT_SCHEMA,
    content_id_param: id,
  });
  if (!rpcError && rpcData) {
    const rows = (rpcData as ContentRow[]) ?? [];
    return rows[0] ?? null;
  }
  if (rpcError) {
    console.warn("getContentById RPC failed, trying direct query:", { message: rpcError.message, code: rpcError.code });
  }

  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("getContentById direct query failed:", { message: error.message, code: error.code });
    return null;
  }
  return data as ContentRow;
}

/**
 * Server-only: fetch published page or post by type slug and URL slug. Used for public routes.
 * Per prd-technical: uses RPC (get_published_content_by_slug_dynamic), not .from().
 */
export async function getPublishedContentByTypeAndSlug(
  typeSlug: "page" | "post",
  slug: string
): Promise<ContentRow | null> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_published_content_by_slug_dynamic", {
    schema_name: CONTENT_SCHEMA,
    type_slug: typeSlug,
    slug_param: slug,
  });

  if (error) {
    console.error("getPublishedContentByTypeAndSlug:", {
      message: error.message,
      code: error.code,
    });
    return null;
  }
  const rows = (data as ContentRow[] | null) ?? [];
  return rows[0] ?? null;
}

/**
 * Server-only: fetch published posts for blog list. Ordered by published_at desc.
 * Per prd-technical: uses RPC (get_published_posts_dynamic), not .from().
 */
export async function getPublishedPosts(limit = 50): Promise<ContentRow[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_published_posts_dynamic", {
    schema_name: CONTENT_SCHEMA,
    limit_param: limit,
  });

  if (error) {
    console.error("getPublishedPosts:", {
      message: error.message,
      code: error.code,
    });
    return [];
  }
  return (data as ContentRow[]) ?? [];
}

export async function insertContent(row: {
  content_type_id: string;
  title: string;
  slug: string;
  body: Record<string, unknown> | null;
  excerpt: string | null;
  featured_image_id: string | null;
  status: string;
  published_at: string | null;
  custom_fields?: Record<string, unknown>;
}): Promise<{ id: string } | null> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content")
    .insert({
      ...row,
      custom_fields: row.custom_fields ?? {},
    })
    .select("id")
    .single();
  if (error) {
    console.error("insertContent:", error);
    return null;
  }
  return data as { id: string };
}

export async function updateContent(
  id: string,
  row: Partial<{
    title: string;
    slug: string;
    body: Record<string, unknown> | null;
    excerpt: string | null;
    featured_image_id: string | null;
    status: string;
    published_at: string | null;
    custom_fields: Record<string, unknown>;
  }>
): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase.schema(CONTENT_SCHEMA).from("content").update(row).eq("id", id);
  if (error) {
    console.error("updateContent:", error);
    return false;
  }
  return true;
}

export async function deleteContent(id: string): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase.schema(CONTENT_SCHEMA).from("content").delete().eq("id", id);
  if (error) {
    console.error("deleteContent:", error);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Content type fields
// -----------------------------------------------------------------------------

export async function getContentTypeFields(): Promise<ContentTypeField[]> {
  const supabase = createClientSupabaseClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc("get_content_type_fields_dynamic", {
    schema_name: CONTENT_SCHEMA,
  });
  if (!rpcError && rpcData) {
    return (rpcData as ContentTypeField[]) ?? [];
  }
  if (rpcError) {
    console.warn("getContentTypeFields RPC failed, trying direct query:", {
      message: rpcError.message,
      code: rpcError.code,
    });
  }
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_type_fields")
    .select("*")
    .order("content_type_id", { ascending: true })
    .order("display_order", { ascending: true })
    .order("key", { ascending: true });
  if (error) {
    console.error("getContentTypeFields direct query failed:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContentTypeField[]) ?? [];
}

export async function getContentTypeFieldsByContentType(contentTypeId: string): Promise<ContentTypeField[]> {
  const supabase = createClientSupabaseClient();
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_content_type_fields_by_content_type_dynamic",
    { schema_name: CONTENT_SCHEMA, content_type_id_param: contentTypeId }
  );
  if (!rpcError && rpcData) {
    return (rpcData as ContentTypeField[]) ?? [];
  }
  if (rpcError) {
    console.warn("getContentTypeFieldsByContentType RPC failed, trying direct query:", {
      message: rpcError.message,
      code: rpcError.code,
    });
  }
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_type_fields")
    .select("*")
    .eq("content_type_id", contentTypeId)
    .order("display_order", { ascending: true })
    .order("key", { ascending: true });
  if (error) {
    console.error("getContentTypeFieldsByContentType direct query failed:", { message: error.message, code: error.code });
    return [];
  }
  return (data as ContentTypeField[]) ?? [];
}

export async function insertContentTypeField(row: {
  content_type_id: string;
  key: string;
  label: string;
  type: string;
  config?: Record<string, unknown>;
  display_order?: number;
}): Promise<{ id: string } | null> {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_type_fields")
    .insert({
      content_type_id: row.content_type_id,
      key: row.key,
      label: row.label,
      type: row.type,
      config: row.config ?? {},
      display_order: row.display_order ?? 0,
    })
    .select("id")
    .single();
  if (error) {
    console.error("insertContentTypeField:", error);
    return null;
  }
  return data as { id: string };
}

export async function updateContentTypeField(
  id: string,
  row: Partial<{ key: string; label: string; type: string; config: Record<string, unknown>; display_order: number }>
): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase
    .schema(CONTENT_SCHEMA)
    .from("content_type_fields")
    .update(row)
    .eq("id", id);
  if (error) {
    console.error("updateContentTypeField:", error);
    return false;
  }
  return true;
}

export async function deleteContentTypeField(id: string): Promise<boolean> {
  const supabase = createClientSupabaseClient();
  const { error } = await supabase.schema(CONTENT_SCHEMA).from("content_type_fields").delete().eq("id", id);
  if (error) {
    console.error("deleteContentTypeField:", error);
    return false;
  }
  return true;
}
