/**
 * Content type definitions for the CMS.
 */

export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown> | null; // JSONB from Tiptap
  excerpt: string | null;
  featured_image_id: string | null;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Content type (from content_types table). */
export interface ContentType {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  is_core: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Content type field (from content_type_fields table). */
export interface ContentTypeField {
  id: string;
  content_type_id: string;
  key: string;
  label: string;
  type: string;
  config: Record<string, unknown>;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** List row: content + type slug/label (from get_content_list_with_types_dynamic). */
export interface ContentListItem {
  id: string;
  content_type_id: string;
  type_slug: string;
  type_label: string;
  title: string;
  slug: string;
  status: string;
  /** public | members | mag; used for membership indicator (red "M") and optional "Is Membership" filter. */
  access_level?: string | null;
  updated_at: string;
  /** Include in RAG Knowledge Export for chatbot training. */
  use_for_agent_training?: boolean;
}

/** Full content row for edit (from content table / get_content_by_id_dynamic). */
export interface ContentRow {
  id: string;
  content_type_id: string;
  title: string;
  slug: string;
  body: Record<string, unknown> | null;
  excerpt: string | null;
  featured_image_id: string | null;
  status: string;
  published_at: string | null;
  author_id: string | null;
  custom_fields: Record<string, unknown>;
  access_level: string | null;
  required_mag_id: string | null;
  visibility_mode: string | null;
  restricted_message: string | null;
  section_restrictions: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  /** Include in RAG Knowledge Export for chatbot training. */
  use_for_agent_training?: boolean;
}

export interface Gallery {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_id: string | null;
  status: "draft" | "published";
  access_level: string | null;
  required_mag_id: string | null;
  visibility_mode: string | null;
  restricted_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  gallery_id: string;
  media_id: string;
  position: number;
  caption: string | null;
  created_at: string;
}

/** Gallery cell display scale (physical size of cells in the grid) */
export type GalleryCellSize = "xsmall" | "small" | "medium" | "large" | "xlarge";

/** Sort order for gallery items (custom = use gallery_items.position) */
export type GallerySortOrder =
  | "as_added"
  | "name_asc"
  | "name_desc"
  | "date_newest"
  | "date_oldest"
  | "custom";

/** Display style preset for a gallery (from gallery_display_styles table) */
export interface GalleryDisplayStyle {
  id: string;
  gallery_id: string;
  name: string;
  layout: "grid" | "masonry" | "slider";
  columns: number;
  gap: "sm" | "md" | "lg";
  size: "thumbnail" | "small" | "medium" | "large" | "original";
  cell_size?: GalleryCellSize | null;
  captions: boolean;
  lightbox: boolean;
  border: "none" | "subtle" | "frame";
  sort_order?: GallerySortOrder | null;
  slider_animation: "slide" | "fade" | null;
  slider_autoplay: boolean | null;
  slider_delay: number | null;
  slider_controls: "arrows" | "dots" | "both" | "none" | null;
  created_at: string;
  updated_at: string;
}

export type MediaType = "image" | "video";
export type MediaProvider = "supabase" | "vimeo" | "youtube" | "adilo";

export interface Media {
  id: string;
  type: MediaType;
  url: string;
  provider: MediaProvider | null;
  filename: string | null;
  mime_type: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  created_at: string;
}

export interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  fields: FormField[];
  settings: {
    notifications?: {
      email?: string;
    };
    redirect_url?: string;
    success_message?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export type FormSubmissionStatus = "new" | "contacted" | "archived";

export interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, unknown>; // JSONB with submitted form data
  status: FormSubmissionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id: string;
  key: string;
  value: Record<string, unknown> | null; // JSONB
  created_at: string;
  updated_at: string;
}
