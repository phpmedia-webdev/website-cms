/**
 * Schema management utilities for multi-schema Supabase architecture.
 * Each client deployment uses a dedicated schema for data isolation.
 */

/** Default schema when NEXT_PUBLIC_CLIENT_SCHEMA is not set (e.g. local dev / template). */
export const DEFAULT_CLIENT_SCHEMA = "website_cms_template_dev";

/**
 * Get the client schema name from environment variables.
 * This is set per Vercel deployment. Returns DEFAULT_CLIENT_SCHEMA when unset so dashboard and app can load.
 */
export function getClientSchema(): string {
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA?.trim();
  if (schema) return schema;
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.warn("NEXT_PUBLIC_CLIENT_SCHEMA is not set; using", DEFAULT_CLIENT_SCHEMA);
  }
  return DEFAULT_CLIENT_SCHEMA;
}

/**
 * Get the storage bucket name for the current client.
 * Uses naming convention: client-{schema-name}
 */
export function getClientBucket(): string {
  const schema = getClientSchema();
  return `client-${schema}`;
}

/**
 * Format a table name with schema prefix for raw SQL queries.
 * Example: "client_abc123.posts"
 */
export function getTableName(table: string): string {
  const schema = getClientSchema();
  return `${schema}.${table}`;
}

/**
 * Validate schema name format (alphanumeric and underscores only).
 */
export function isValidSchemaName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}
