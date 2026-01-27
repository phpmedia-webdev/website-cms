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
      let execError: { message: string } | null = null;
      try {
        const res = await supabase.rpc("exec_sql", { sql: statement });
        execError = res.error;
      } catch {
        console.warn(`   ⚠️  Statement requires manual execution (RPC not available):`);
        console.warn(`   ${statement.substring(0, 100)}...`);
        continue;
      }

      if (execError) {
        console.error(`   ❌ Error: ${execError.message}`);
        throw execError;
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed to execute statement: ${msg}`);
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

  const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Create schema
    console.log("📦 Step 1: Creating schema...");
    let schemaError: { message: string } | null = null;
    try {
      const res = await supabase.rpc("exec_sql", {
        sql: `CREATE SCHEMA IF NOT EXISTS ${schemaName};`,
      });
      schemaError = res.error;
    } catch {
      console.warn("   ⚠️  RPC exec_sql not available. Please create schema manually:");
      console.warn(`   CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
    }

    if (schemaError) {
      console.error(`   ❌ Error creating schema: ${schemaError.message}`);
      throw new Error(schemaError.message);
    }
    console.log("   ✅ Schema created");

    // Step 2: Run migrations
    const migrations = [
      { file: "026_create_media_with_variants.sql", desc: "Creating media tables" },
      { file: "027_enable_rls_media.sql", desc: "Enabling RLS for media" },
      { file: "038_fix_all_media_rpc_functions.sql", desc: "Creating media RPC functions" },
      // Note: Media migrations 028, 031, 034, 036, 037 are replaced by 038
      // Note: Storage policies are set up in Step 3b below
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

    // Step 3b: Setup storage bucket policies
    console.log("\n🔒 Step 3b: Setting up storage bucket policies...");
    try {
      // Enable RLS on storage.objects if not already enabled
      const enableRLSSQL = `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`;
      
      // Create storage policies for the bucket
      const policySQL = `
        DO $$
        DECLARE
          bucket_name TEXT := '${bucketName}';
          bucket_id_val UUID;
        BEGIN
          -- Get bucket ID
          SELECT id INTO bucket_id_val FROM storage.buckets WHERE name = bucket_name;
          
          IF bucket_id_val IS NULL THEN
            RAISE WARNING 'Bucket % does not exist. Policies will be skipped.', bucket_name;
            RETURN;
          END IF;

          -- Policy 1: Allow authenticated users to upload files (INSERT)
          DROP POLICY IF EXISTS "Allow authenticated uploads_${bucketName}" ON storage.objects;
          CREATE POLICY "Allow authenticated uploads_${bucketName}"
          ON storage.objects
          FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = bucket_id_val
          );

          -- Policy 2: Allow authenticated users to update files (UPDATE)
          DROP POLICY IF EXISTS "Allow authenticated updates_${bucketName}" ON storage.objects;
          CREATE POLICY "Allow authenticated updates_${bucketName}"
          ON storage.objects
          FOR UPDATE
          TO authenticated
          USING (
            bucket_id = bucket_id_val
          )
          WITH CHECK (
            bucket_id = bucket_id_val
          );

          -- Policy 3: Allow authenticated users to delete files (DELETE)
          DROP POLICY IF EXISTS "Allow authenticated deletes_${bucketName}" ON storage.objects;
          CREATE POLICY "Allow authenticated deletes_${bucketName}"
          ON storage.objects
          FOR DELETE
          TO authenticated
          USING (
            bucket_id = bucket_id_val
          );

          -- Policy 4: Allow public read access (SELECT)
          DROP POLICY IF EXISTS "Allow public reads_${bucketName}" ON storage.objects;
          CREATE POLICY "Allow public reads_${bucketName}"
          ON storage.objects
          FOR SELECT
          TO public
          USING (
            bucket_id = bucket_id_val
          );

          RAISE NOTICE 'Storage policies configured for bucket: % (ID: %)', bucket_name, bucket_id_val;
        END $$;
      `;

      // Enable RLS first
      let rlsError: { message: string } | null = null;
      try {
        const rlsRes = await supabase.rpc("exec_sql", { sql: enableRLSSQL });
        rlsError = rlsRes.error;
      } catch {
        /* RPC not available */
      }

      if (rlsError) {
        console.warn(`   ⚠️  Could not enable RLS on storage.objects: ${rlsError.message}`);
      }

      // Create policies
      let policyError: { message: string } | null = null;
      try {
        const policyRes = await supabase.rpc("exec_sql", { sql: policySQL });
        policyError = policyRes.error;
      } catch {
        console.warn("   ⚠️  Could not set storage policies automatically (RPC not available)");
        console.warn("   Please configure storage policies manually in Supabase Dashboard:");
        console.warn(`   Storage → ${bucketName} → Policies`);
      }

      if (policyError) {
        console.warn(`   ⚠️  Could not set storage policies: ${policyError.message}`);
        console.warn("   Please configure storage policies manually in Supabase Dashboard:");
        console.warn(`   Storage → ${bucketName} → Policies`);
        console.warn("   See migration 039_setup_storage_bucket_policies.sql for policy details");
      } else {
        console.log(`   ✅ Storage bucket policies configured`);
      }
    } catch (error: any) {
      console.warn(`   ⚠️  Error setting storage policies: ${error.message}`);
      console.warn("   Please configure storage policies manually in Supabase Dashboard:");
      console.warn(`   Storage → ${bucketName} → Policies`);
      console.warn("   See migration 039_setup_storage_bucket_policies.sql for policy details");
    }

    // Step 4: Refresh PostgREST cache
    console.log("\n🔄 Step 4: Refreshing PostgREST cache...");
    let notifyError: { message: string } | null = null;
    try {
      const notifyRes = await supabase.rpc("exec_sql", {
        sql: `NOTIFY pgrst, 'reload schema';`,
      });
      notifyError = notifyRes.error;
    } catch {
      console.warn("   ⚠️  Could not refresh cache automatically");
      console.warn("   Please run manually: NOTIFY pgrst, 'reload schema';");
    }

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
    console.error("   See Manual Setup Steps in docs/prd-technical.md or docs/archived/zzz-CLIENT_SETUP_CHECKLIST.md");
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
