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

export interface Gallery {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_id: string | null;
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
