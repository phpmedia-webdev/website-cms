/**
 * Test script to verify settings table is accessible
 * Run with: pnpm tsx scripts/test-settings-query.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA;

if (!supabaseUrl || !serviceRoleKey || !schema) {
  console.error("Missing required environment variables");
  process.exit(1);
}

async function testSettingsQuery() {
  console.log("Testing settings table access...");
  console.log("Schema:", schema);
  console.log("Supabase URL:", supabaseUrl);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Test 1: Try to query settings table
  console.log("\n--- Test 1: Query settings table ---");
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .limit(5);

  if (error) {
    console.error("Error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  } else {
    console.log("Success! Found", data?.length || 0, "settings");
    console.log("Sample data:", data?.slice(0, 3));
  }

  // Test 2: Try to query a specific setting
  console.log("\n--- Test 2: Query specific setting ---");
  const { data: themeData, error: themeError } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "design_system.theme")
    .single();

  if (themeError) {
    console.error("Error:", {
      message: themeError.message,
      details: themeError.details,
      hint: themeError.hint,
      code: themeError.code,
    });
  } else {
    console.log("Success! Theme setting:", themeData);
  }

  // Test 3: List all tables in schema (if possible)
  console.log("\n--- Test 3: Check if table exists ---");
  const { data: tables, error: tablesError } = await supabase.rpc("exec_sql", {
    sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = 'settings'`,
  }).catch(() => {
    // RPC might not be available, try alternative
    return { data: null, error: { message: "RPC not available" } };
  });

  if (tablesError) {
    console.log("Could not check table existence (RPC not available)");
  } else {
    console.log("Table exists check:", tables);
  }
}

testSettingsQuery()
  .then(() => {
    console.log("\n--- Test complete ---");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
