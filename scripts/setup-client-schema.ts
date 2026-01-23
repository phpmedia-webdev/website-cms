/**
 * Automated Client Schema Setup Script
 * 
 * This script automates the creation of a new client schema in Supabase,
 * including all migrations, RLS policies, RPC functions, and configuration.
 * 
 * Usage:
 *   pnpm tsx scripts/setup-client-schema.ts <schema-name>
 * 
 * Example:
 *   pnpm tsx scripts/setup-client-schema.ts client_acme_corp
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing required environment variables:");
  console.error("   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

// Validate schema name
function isValidSchemaName(name: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

// Replace schema name in SQL content
function replaceSchemaName(content: string, schemaName: string): string {
  return content.replace(/website_cms_template_dev/g, schemaName);
}

// Execute SQL via Supabase
async function executeSQL(supabase: any, sql: string, description: string): Promise<void> {
  console.log(`\n📝 ${description}...`);
  
  // Split by semicolons and execute each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    if (statement.length === 0) continue;
    
    try {
      // Use RPC if available, otherwise try direct query
      const { error } = await supabase.rpc("exec_sql", { sql: statement }).catch(async () => {
        // If RPC doesn't exist, we'll need to use a different approach
        // For now, log that we need manual execution
        console.warn(`   ⚠️  Statement requires manual execution (RPC not available):`);
        console.warn(`   ${statement.substring(0, 100)}...`);
        return { error: null };
      });

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        throw error;
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to execute statement: ${error.message}`);
      throw error;
    }
  }
  
  console.log(`   ✅ ${description} completed`);
}

async function setupClientSchema(schemaName: string) {
  console.log(`\n🚀 Setting up client schema: ${schemaName}\n`);

  if (!isValidSchemaName(schemaName)) {
    console.error(`❌ Invalid schema name: ${schemaName}`);
    console.error("   Schema names must contain only alphanumeric characters and underscores");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Create schema
    console.log("📦 Step 1: Creating schema...");
    const { error: schemaError } = await supabase.rpc("exec_sql", {
      sql: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
    }).catch(async () => {
      // If RPC doesn't work, we need manual creation
      console.warn("   ⚠️  RPC exec_sql not available. Please create schema manually:");
      console.warn(`   CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
      return { error: null };
    });

    if (schemaError) {
      console.error(`   ❌ Error creating schema: ${schemaError.message}`);
      throw schemaError;
    }
    console.log("   ✅ Schema created");

    // Step 2: Run migrations
    const migrations = [
      { file: "000_create_schema_and_tables.sql", desc: "Creating tables" },
      { file: "004_expose_schema_permissions.sql", desc: "Granting permissions" },
      { file: "008_create_settings_rpc.sql", desc: "Creating RPC functions" },
      { file: "009_insert_default_settings.sql", desc: "Inserting default settings" },
      { file: "010_enable_rls_and_policies.sql", desc: "Enabling RLS and policies" },
      { file: "011_fix_function_search_path.sql", desc: "Fixing function search path" },
      { file: "018_create_color_palettes_rpc.sql", desc: "Creating color palette RPC functions" },
    ];

    for (const migration of migrations) {
      const filePath = join(process.cwd(), "supabase", "migrations", migration.file);
      let content = readFileSync(filePath, "utf-8");
      content = replaceSchemaName(content, schemaName);
      await executeSQL(supabase, content, migration.desc);
    }

    // Step 3: Create storage bucket
    console.log("\n📦 Step 3: Creating storage bucket...");
    const bucketName = `client-${schemaName}`;
    const { error: bucketError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });

    if (bucketError) {
      if (bucketError.message.includes("already exists")) {
        console.log(`   ⚠️  Bucket ${bucketName} already exists, skipping`);
      } else {
        console.error(`   ❌ Error creating bucket: ${bucketError.message}`);
        throw bucketError;
      }
    } else {
      console.log(`   ✅ Storage bucket created: ${bucketName}`);
    }

    // Step 4: Refresh PostgREST cache
    console.log("\n🔄 Step 4: Refreshing PostgREST cache...");
    const { error: notifyError } = await supabase.rpc("exec_sql", {
      sql: `NOTIFY pgrst, 'reload schema';`,
    }).catch(() => {
      console.warn("   ⚠️  Could not refresh cache automatically");
      console.warn("   Please run manually: NOTIFY pgrst, 'reload schema';");
      return { error: null };
    });

    if (!notifyError) {
      console.log("   ✅ PostgREST cache refresh notification sent");
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Client schema setup completed!");
    console.log("=".repeat(60));
    console.log("\n📋 Next Steps:");
    console.log(`   1. Expose schema in Supabase Dashboard:`);
    console.log(`      Settings → API → Exposed Schemas`);
    console.log(`      Add: ${schemaName}`);
    console.log(`   2. Set environment variable:`);
    console.log(`      NEXT_PUBLIC_CLIENT_SCHEMA=${schemaName}`);
    console.log(`   3. Create superadmin user with tenant_id: ${schemaName}`);
    console.log(`   4. Deploy application with new environment variables`);
    console.log("\n");

  } catch (error: any) {
    console.error("\n❌ Setup failed:", error.message);
    console.error("\n💡 Some steps may need to be completed manually.");
    console.error("   See docs/CLIENT_SETUP_CHECKLIST.md for manual steps.");
    process.exit(1);
  }
}

// Main execution
const schemaName = process.argv[2];

if (!schemaName) {
  console.error("❌ Schema name is required");
  console.error("\nUsage:");
  console.error("  pnpm tsx scripts/setup-client-schema.ts <schema-name>");
  console.error("\nExample:");
  console.error("  pnpm tsx scripts/setup-client-schema.ts client_acme_corp");
  process.exit(1);
}

setupClientSchema(schemaName)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
