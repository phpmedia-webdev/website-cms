/**
 * Schema management utilities for multi-schema Supabase architecture.
 * Each client deployment uses a dedicated schema for data isolation.
 */

/**
 * Get the client schema name from environment variables.
 * This is set per Vercel deployment.
 */
export function getClientSchema(): string {
  const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA;
  if (!schema) {
    throw new Error(
      "NEXT_PUBLIC_CLIENT_SCHEMA environment variable is not set"
    );
  }
  return schema;
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
