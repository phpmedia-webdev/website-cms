# Adding New Tables to Custom Schema - Complete Guide

> **Quick Reference:** See `docs/ADDING_NEW_TABLES_CHECKLIST.md` for a condensed checklist version.

## Problem: PostgREST Schema Search Issue

**The Core Issue:**
When you create a table in a custom schema (e.g., `website_cms_template_dev`), PostgREST often cannot find it even if:
- The schema is exposed in Supabase Dashboard
- Permissions are granted correctly
- RLS is enabled

**Why This Happens:**
PostgREST searches for tables in exposed schemas, but it has a caching mechanism that doesn't always recognize new tables. Even after running `NOTIFY pgrst, 'reload schema'`, PostgREST may still look in the `public` schema first and fail with errors like:
```
Could not find the table 'public.your_table' in the schema cache
```

**The Solution:**
Use **RPC functions in the `public` schema** that query your custom schema. This is the same approach used for `settings` and `color_palettes` tables.

---

## Two Approaches: When to Use Which

### Approach 1: Direct Table Access (`.from()`)
**Use for:** Tables created during initial schema setup (before PostgREST caches the schema)

**Works for:**
- `posts`, `galleries`, `media`, `forms` (created in initial migration)
- Tables that PostgREST recognized when schema was first exposed

**Doesn't work for:**
- New tables added after initial setup
- Tables added after PostgREST has cached the schema

### Approach 2: RPC Functions (Recommended for New Tables)
**Use for:** Any table added after the initial schema setup

**Why it works:**
- RPC functions are in `public` schema (PostgREST always finds them)
- Functions use `SECURITY DEFINER` with `SET search_path` to query custom schema
- Bypasses PostgREST's schema search entirely

**Examples:**
- `settings` table → `get_setting()`, `get_settings()` RPC functions
- `color_palettes` table → `get_color_palettes()`, `get_predefined_color_palettes()` RPC functions

---

## Complete Checklist: Adding a New Table

### Step 1: Create the Table Migration

**File:** `supabase/migrations/XXX_create_your_table.sql`

```sql
-- Replace 'website_cms_template_dev' with your client schema name
-- Replace 'your_table' with your actual table name

CREATE TABLE IF NOT EXISTS website_cms_template_dev.your_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Add your columns here
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if needed
CREATE INDEX IF NOT EXISTS idx_your_table_name ON website_cms_template_dev.your_table(name);

-- Create trigger for updated_at (if needed)
CREATE TRIGGER update_your_table_updated_at BEFORE UPDATE ON website_cms_template_dev.your_table
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (REQUIRED)
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.your_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON website_cms_template_dev.your_table TO authenticated;
```

**✅ Checklist:**
- [ ] Table created with schema-qualified name (`schema.table`)
- [ ] Permissions granted to `anon` and `authenticated`
- [ ] Indexes created if needed
- [ ] Triggers created if needed

---

### Step 2: Enable RLS and Create Policies

**File:** `supabase/migrations/XXX_enable_rls_your_table.sql`

```sql
-- Enable RLS on your_table
ALTER TABLE website_cms_template_dev.your_table ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (full access)
CREATE POLICY "Allow authenticated users full access to your_table"
  ON website_cms_template_dev.your_table
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy for public/anonymous access (if needed)
-- Adjust the USING clause based on your needs
CREATE POLICY "Allow public read access to your_table"
  ON website_cms_template_dev.your_table
  FOR SELECT
  TO anon
  USING (true); -- Or add conditions like: is_published = true
```

**✅ Checklist:**
- [ ] RLS enabled on table
- [ ] Policy created for `authenticated` users
- [ ] Policy created for `anon` users (if needed)
- [ ] Policies use correct schema-qualified table name

---

### Step 3: Create RPC Functions (CRITICAL for New Tables)

**File:** `supabase/migrations/XXX_create_your_table_rpc.sql`

**Why this step is critical:** This bypasses PostgREST's schema search issues.

```sql
-- Create RPC functions in public schema to query custom schema
-- This is the WORKAROUND for PostgREST not finding tables in custom schemas

-- Function to get all records
CREATE OR REPLACE FUNCTION public.get_all_your_tables()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
  -- Add all columns from your table
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yt.id,
    yt.name,
    yt.created_at,
    yt.updated_at
  FROM website_cms_template_dev.your_table yt
  ORDER BY yt.created_at DESC;
END;
$$;

-- Function to get a single record by ID
CREATE OR REPLACE FUNCTION public.get_your_table_by_id(record_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    yt.id,
    yt.name,
    yt.created_at,
    yt.updated_at
  FROM website_cms_template_dev.your_table yt
  WHERE yt.id = record_id
  LIMIT 1;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_all_your_tables() TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_your_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_your_table_by_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_your_table_by_id(UUID) TO authenticated;
```

**✅ Checklist:**
- [ ] RPC functions created in `public` schema
- [ ] Functions use `SECURITY DEFINER` with `SET search_path`
- [ ] Functions query the custom schema table
- [ ] Execute permissions granted to `anon` and `authenticated`
- [ ] Functions match your table's column structure

**Key Points:**
- Functions must be in `public` schema (PostgREST requirement)
- `SET search_path` tells PostgreSQL which schema to search
- `SECURITY DEFINER` allows function to access custom schema
- Return type must match your table columns exactly

---

### Step 4: Update TypeScript Code

**File:** `src/lib/supabase/your-table.ts`

```typescript
import { createServerSupabaseClient } from "@/lib/supabase/client";
import type { YourTableEntry } from "@/types/your-table";

/**
 * Get all records
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getAllYourTables(): Promise<YourTableEntry[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_all_your_tables");

    if (error) {
      console.error("Error fetching records:", error);
      throw error;
    }
    
    return (data as YourTableEntry[]) || [];
  } catch (error) {
    console.error("Error fetching records (catch):", error);
    return [];
  }
}

/**
 * Get a single record by ID
 * Uses RPC function to bypass PostgREST schema search issues
 */
export async function getYourTableById(id: string): Promise<YourTableEntry | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("get_your_table_by_id", {
      record_id: id,
    });

    if (error) throw error;
    // RPC returns an array, get first item
    return (data && data.length > 0) ? (data[0] as YourTableEntry) : null;
  } catch (error) {
    console.error("Error fetching record:", error);
    return null;
  }
}

/**
 * Create a new record
 * NOTE: For write operations, try .from() first. If it fails, create RPC functions.
 */
export async function createYourTable(
  payload: YourTablePayload
): Promise<YourTableEntry | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("your_table") // Try direct access first
      .insert({
        name: payload.name,
        // ... other fields
      })
      .select()
      .single();

    if (error) {
      // If this fails with "table not found", create RPC function for insert
      console.error("Error creating record:", error);
      throw error;
    }
    return data as YourTableEntry;
  } catch (error) {
    console.error("Error creating record (catch):", error);
    return null;
  }
}
```

**✅ Checklist:**
- [ ] Read operations use RPC functions (`.rpc()`)
- [ ] Write operations try `.from()` first
- [ ] Error handling includes detailed logging
- [ ] Types match your table structure

---

### Step 5: Verify Schema is Exposed

**In Supabase Dashboard:**
1. Go to **Settings** → **API** → **Exposed Schemas**
2. Verify your schema (`website_cms_template_dev`) is listed
3. If not, add it and click **Save**

**✅ Checklist:**
- [ ] Schema is listed in Exposed Schemas
- [ ] Saved after adding

---

### Step 6: Run Migrations in Order

Run migrations in Supabase SQL Editor in this order:

1. **Create table migration** (`XXX_create_your_table.sql`)
2. **Enable RLS migration** (`XXX_enable_rls_your_table.sql`)
3. **Create RPC functions** (`XXX_create_your_table_rpc.sql`)

**✅ Checklist:**
- [ ] All migrations run successfully
- [ ] No errors in SQL Editor
- [ ] Table exists: `SELECT * FROM website_cms_template_dev.your_table LIMIT 1;`
- [ ] RPC functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_%your_table%';`

---

### Step 7: Test Access

**Test RPC Functions:**
```sql
-- Test in Supabase SQL Editor
SELECT * FROM public.get_all_your_tables();
SELECT * FROM public.get_your_table_by_id('some-uuid-here');
```

**Test in Code:**
- Create a test API route or component
- Call your TypeScript functions
- Check browser console for errors

**✅ Checklist:**
- [ ] RPC functions return data in SQL Editor
- [ ] TypeScript functions work without errors
- [ ] No "table not found" errors

---

## Write Operations (INSERT, UPDATE, DELETE)

### Option A: Try Direct Access First

For write operations, PostgREST may work differently. Try using `.from()` first:

```typescript
const { data, error } = await supabase
  .from("your_table")
  .insert({ ... })
  .select()
  .single();
```

**If this works:** Great! No RPC function needed for writes.

**If this fails with "table not found":** Create RPC functions for write operations.

### Option B: Create RPC Functions for Writes

If direct access fails, create RPC functions:

```sql
-- Insert function
CREATE OR REPLACE FUNCTION public.create_your_table(
  p_name TEXT,
  -- other parameters
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO website_cms_template_dev.your_table (name)
  VALUES (p_name)
  RETURNING id INTO new_id;
  
  RETURN QUERY
  SELECT * FROM website_cms_template_dev.your_table
  WHERE id = new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_your_table(TEXT) TO authenticated;
```

---

## Troubleshooting

### Error: "Could not find the table 'public.your_table'"

**Cause:** PostgREST is looking in `public` schema instead of your custom schema.

**Solution:**
1. ✅ Verify you're using RPC functions for read operations
2. ✅ Check that RPC functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_%your_table%';`
3. ✅ Verify RPC functions have correct `SET search_path`
4. ✅ Check that schema is exposed in Dashboard

### Error: "Could not find the function 'public.get_your_table'"

**Cause:** RPC function doesn't exist or wasn't created properly.

**Solution:**
1. ✅ Run the RPC function migration again
2. ✅ Check function exists: `SELECT * FROM information_schema.routines WHERE routine_name = 'get_your_table';`
3. ✅ Verify execute permissions: `SELECT * FROM information_schema.routine_privileges WHERE routine_name = 'get_your_table';`

### Error: "permission denied for schema"

**Cause:** Permissions not granted correctly.

**Solution:**
1. ✅ Run migration `004_expose_schema_permissions.sql` (or equivalent)
2. ✅ Verify: `SELECT * FROM information_schema.table_privileges WHERE table_schema = 'website_cms_template_dev' AND table_name = 'your_table';`
3. ✅ Grant USAGE on schema: `GRANT USAGE ON SCHEMA website_cms_template_dev TO anon, authenticated;`

### RPC Function Returns Empty Array

**Cause:** RLS policies blocking access or function query issue.

**Solution:**
1. ✅ Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'your_table';`
2. ✅ Test function with service role (bypasses RLS): Use Supabase SQL Editor with service role
3. ✅ Verify function query: Test the SQL inside the function directly

---

## Quick Reference: Migration File Naming

Use sequential numbering:
- `012_create_color_palettes_table.sql`
- `013_insert_predefined_color_palettes.sql`
- `014_enable_rls_color_palettes.sql`
- `015_refresh_postgrest_after_color_palettes.sql` (optional)
- `018_create_color_palettes_rpc.sql` (CRITICAL)

**Note:** The RPC migration can come after other migrations, but must be run before using the table in code.

---

## Summary: The Golden Rule

**For any new table added after initial schema setup:**

1. ✅ Create table with permissions
2. ✅ Enable RLS with policies
3. ✅ **Create RPC functions in `public` schema** (CRITICAL)
4. ✅ Use RPC functions in TypeScript code (`.rpc()` not `.from()`)
5. ✅ Test write operations with `.from()` first, create RPC if needed

**This approach has worked for:**
- ✅ `settings` table
- ✅ `color_palettes` table

**This approach will work for:**
- Any future tables you add

---

## Security Considerations

**⚠️ Important:** The RPC function approach uses `SECURITY DEFINER`, which requires careful security configuration.

**Security Status:** ✅ **SAFE** when properly configured

**Key Security Points:**
- ✅ RLS policies still apply (evaluated for caller, not function owner)
- ✅ `SET search_path` prevents search path injection
- ✅ Typed parameters prevent SQL injection
- ✅ Execute permissions should be granted only to necessary roles

**For sensitive tables:**
- Only grant execute to `authenticated` (not `anon`)
- Add additional RLS conditions
- Consider audit logging

**See:** `docs/SECURITY_RPC_FUNCTIONS.md` for complete security analysis.

---

## Example: Complete Migration Set

See these files for complete examples:
- `supabase/migrations/012_create_color_palettes_table.sql` - Table creation
- `supabase/migrations/014_enable_rls_color_palettes.sql` - RLS setup
- `supabase/migrations/018_create_color_palettes_rpc.sql` - RPC functions
- `src/lib/supabase/color-palettes.ts` - TypeScript implementation
