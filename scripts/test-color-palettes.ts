/**
 * Test script to verify color_palettes table exists and is accessible
 * Run with: pnpm tsx scripts/test-color-palettes.ts
 */

// Load environment variables FIRST before importing anything
import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

async function testColorPalettes() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const schema = process.env.NEXT_PUBLIC_CLIENT_SCHEMA;
    
    if (!supabaseUrl || !serviceRoleKey || !schema) {
      console.error("Missing required environment variables:");
      console.error("NEXT_PUBLIC_SUPABASE_URL:", !!supabaseUrl);
      console.error("SUPABASE_SERVICE_ROLE_KEY:", !!serviceRoleKey);
      console.error("NEXT_PUBLIC_CLIENT_SCHEMA:", !!schema);
      return;
    }
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    console.log("Testing color_palettes table access...");
    console.log("Schema:", schema);
    
    // Test 1: Check if table exists via raw SQL
    console.log("\n1. Checking if table exists in schema...");
    let tableExists: unknown = null;
    try {
      const res = await supabase.rpc("exec_sql", {
        sql: `SELECT COUNT(*) as count FROM ${schema}.color_palettes;`,
      });
      tableExists = res.data;
    } catch {
      console.log("   exec_sql RPC not available, trying direct query...");
    }

    if (tableExists) {
      console.log("   ✅ Table exists! Count:", tableExists);
    }
    
    // Test 2: Direct query via PostgREST
    console.log("\n2. Testing direct PostgREST query...");
    const { data, error } = await supabase
      .from("color_palettes")
      .select("*")
      .limit(5);
    
    if (error) {
      console.error("❌ Direct query error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    } else {
      console.log("✅ Direct query success!");
      console.log(`Found ${data?.length || 0} palettes`);
      if (data && data.length > 0) {
        console.log("First palette:", data[0].name);
      }
    }
    
    // Test 3: Count query
    console.log("\n3. Testing count query...");
    const { count, error: countError } = await supabase
      .from("color_palettes")
      .select("*", { count: "exact", head: true });
    
    if (countError) {
      console.error("❌ Count query error:", countError.message);
    } else {
      console.log(`✅ Total palettes: ${count || 0}`);
    }
    
    // Test 4: Predefined palettes only
    console.log("\n4. Testing predefined palettes query...");
    const { data: predefined, error: predefinedError } = await supabase
      .from("color_palettes")
      .select("*")
      .eq("is_predefined", true);
    
    if (predefinedError) {
      console.error("❌ Predefined query error:", predefinedError.message);
    } else {
      console.log(`✅ Found ${predefined?.length || 0} predefined palettes`);
    }
    
  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

testColorPalettes();
