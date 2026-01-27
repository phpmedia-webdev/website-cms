/**
 * One-time script to update an existing user's metadata for CMS access.
 * Run this with: pnpm tsx scripts/update-user-metadata.ts <user-email>
 */

// Load environment variables FIRST before importing anything
import * as dotenv from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const userEmail = process.argv[2];
const schemaName = process.env.NEXT_PUBLIC_CLIENT_SCHEMA || "website_cms_template_dev";

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!userEmail) {
  console.error("Usage: pnpm tsx scripts/update-user-metadata.ts <user-email>");
  console.error("Example: pnpm tsx scripts/update-user-metadata.ts your@email.com");
  process.exit(1);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: Missing required environment variables:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗ Missing");
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", serviceRoleKey ? "✓" : "✗ Missing");
  console.error("\nPlease ensure .env.local exists and contains these variables.");
  process.exit(1);
}

async function main() {
  try {
    // Create Supabase admin client directly
    const supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Searching for user...");

    // Find user by email
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      process.exit(1);
    }

    const user = usersData.users.find((u) => u.email === userEmail);

    if (!user) {
      console.error(`\n❌ User with email "${userEmail}" not found.`);
      console.log("\nAvailable users:");
      usersData.users.forEach((u) => {
        console.log(`  - ${u.email} (${u.id})`);
      });
      process.exit(1);
    }

    console.log(`\n✅ Found user: ${user.email} (${user.id})`);
    console.log(`Current metadata:`, user.user_metadata || "(empty)");

    // Prepare updated metadata
    const existingMetadata = (user.user_metadata || {}) as any;
    const updatedMetadata = {
      ...existingMetadata,
      type: "superadmin",
      role: "superadmin",
      tenant_id: schemaName,
    };

    console.log(`\nUpdating metadata to:`);
    console.log(`  type: "superadmin"`);
    console.log(`  role: "superadmin"`);
    console.log(`  tenant_id: "${schemaName}"`);

    // Update user metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: updatedMetadata,
      }
    );

    if (updateError) {
      console.error("\n❌ Error updating metadata:", updateError);
      process.exit(1);
    }

    console.log("\n✅ Successfully updated user metadata!");
    console.log("New metadata:", updatedUser.user.user_metadata);
    console.log("\n🎉 You can now log in at http://localhost:3000/admin/login");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
