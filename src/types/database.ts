/**
 * Database type definitions.
 * These will be generated from Supabase schema in the future.
 * For now, we define them manually to match our schema design.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  // Schema will be dynamically set per client
  // This is a placeholder structure
  public: {
    Tables: {
      posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: Json | null;
          excerpt: string | null;
          featured_image_id: string | null;
          status: string;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["posts"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
      };
      galleries: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          cover_image_id: string | null;
          status: string;
          access_level: string | null;
          required_mag_id: string | null;
          visibility_mode: string | null;
          restricted_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["galleries"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["galleries"]["Insert"]>;
      };
      gallery_items: {
        Row: {
          id: string;
          gallery_id: string;
          media_id: string;
          position: number;
          caption: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["gallery_items"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gallery_items"]["Insert"]>;
      };
      media: {
        Row: {
          id: string;
          type: string;
          url: string;
          provider: string | null;
          filename: string | null;
          mime_type: string | null;
          size: number | null;
          width: number | null;
          height: number | null;
          alt_text: string | null;
          caption: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["media"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media"]["Insert"]>;
      };
      forms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          fields: Json;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["forms"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["forms"]["Insert"]>;
      };
      form_submissions: {
        Row: {
          id: string;
          form_id: string;
          data: Json;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["form_submissions"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["form_submissions"]["Insert"]>;
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["settings"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
      };
      taxonomy_terms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: "category" | "tag";
          parent_id: string | null;
          description: string | null;
          suggested_sections: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["taxonomy_terms"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["taxonomy_terms"]["Insert"]>;
      };
      taxonomy_relationships: {
        Row: {
          id: string;
          term_id: string;
          content_type: "post" | "page" | "media" | "gallery";
          content_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["taxonomy_relationships"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["taxonomy_relationships"]["Insert"]>;
      };
      section_taxonomy_config: {
        Row: {
          id: string;
          section_name: string;
          display_name: string;
          content_type: "post" | "page" | "media" | "gallery";
          category_slugs: string[] | null;
          tag_slugs: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["section_taxonomy_config"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["section_taxonomy_config"]["Insert"]>;
      };
      members: {
        Row: {
          id: string;
          contact_id: string;
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["members"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
      };
      user_licenses: {
        Row: {
          id: string;
          member_id: string;
          content_type: "media" | "course";
          content_id: string;
          granted_via: string | null;
          granted_at: string;
          expires_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_licenses"]["Row"], "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_licenses"]["Insert"]>;
      };
    };
  };
}
