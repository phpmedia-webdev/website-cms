/**
 * Types for superadmin code snippet library (public.code_snippets).
 */

export interface CodeSnippet {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface CodeSnippetInsert {
  title: string;
  type?: string | null;
  description?: string | null;
  code: string;
}

export interface CodeSnippetUpdate {
  title?: string;
  type?: string | null;
  description?: string | null;
  code?: string;
}
