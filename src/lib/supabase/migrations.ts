/**
 * Schema migration utilities.
 * Handles creating and managing client schemas in Supabase.
 */

import { createServerSupabaseClient } from "./client";
import { getClientSchema, getTableName, isValidSchemaName } from "./schema";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Create a new client schema in Supabase.
 * This should be run once per client deployment.
 */
export async function createClientSchema(schemaName?: string): Promise<void> {
  const schema = schemaName || getClientSchema();

  if (!isValidSchemaName(schema)) {
    throw new Error(`Invalid schema name: ${schema}. Use alphanumeric and underscores only.`);
  }

  const supabase = createServerSupabaseClient();

  // Create schema
  const { error: schemaError } = await supabase.rpc("exec_sql", {
    sql: `CREATE SCHEMA IF NOT EXISTS ${schema};`,
  });

  if (schemaError) {
    // If exec_sql doesn't exist, try direct query (requires service role)
    console.warn("exec_sql RPC not available, attempting direct query");
    // Note: Direct schema creation requires raw SQL execution
    // This might need to be done via Supabase dashboard or CLI
    throw new Error(
      `Schema creation requires manual setup. Please create schema "${schema}" in Supabase.`
    );
  }

  // Read and execute migration
  const migrationPath = join(process.cwd(), "supabase", "migrations", "001_initial_schema.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  // Replace table references with schema-qualified names
  const schemaQualifiedSQL = migrationSQL.replace(
    /CREATE TABLE IF NOT EXISTS (\w+)/g,
    `CREATE TABLE IF NOT EXISTS ${schema}.$1`
  );

  // Execute migration
  const { error: migrationError } = await supabase.rpc("exec_sql", {
    sql: schemaQualifiedSQL,
  });

  if (migrationError) {
    throw new Error(`Migration failed: ${migrationError.message}`);
  }

  // Create storage bucket for this client
  const bucketName = `client-${schema}`;
  const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });

  if (bucketError && !bucketError.message.includes("already exists")) {
    console.warn(`Bucket creation warning: ${bucketError.message}`);
  }
}

/**
 * Check if a schema exists.
 */
export async function schemaExists(schemaName?: string): Promise<boolean> {
  const schema = schemaName || getClientSchema();
  const supabase = createServerSupabaseClient();

  // Try to query a table in the schema
  const { error } = await supabase
    .from(getTableName("settings"))
    .select("id")
    .limit(1);

  return error === null;
}
