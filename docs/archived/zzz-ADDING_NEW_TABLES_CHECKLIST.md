# Quick Checklist: Adding a New Table

**Use this checklist when adding a new table to avoid PostgREST schema search issues.**

## Pre-Flight: Understand the Problem

- [ ] **Read:** `docs/ADDING_NEW_TABLES.md` for full explanation
- [ ] **Know:** PostgREST looks in `public` schema first, can't find custom schema tables
- [ ] **Solution:** Use RPC functions in `public` schema (same as `settings` and `color_palettes`)

---

## Step 1: Create Table Migration

**File:** `supabase/migrations/XXX_create_your_table.sql`

- [ ] Table created with schema-qualified name: `website_cms_template_dev.your_table`
- [ ] Permissions granted: `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO anon, authenticated;`
- [ ] Indexes created (if needed)
- [ ] Triggers created (if needed, e.g., `update_updated_at_column()`)

**Run in Supabase SQL Editor**

---

## Step 2: Enable RLS

**File:** `supabase/migrations/XXX_enable_rls_your_table.sql`

- [ ] RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] Policy for `authenticated` users (full access)
- [ ] Policy for `anon` users (if needed, adjust `USING` clause)
- [ ] All policies use schema-qualified table name

**Run in Supabase SQL Editor**

---

## Step 3: Create RPC Functions ⚠️ CRITICAL

**File:** `supabase/migrations/XXX_create_your_table_rpc.sql`

**This is the workaround that makes it work!**

- [ ] Function created in `public` schema (not custom schema)
- [ ] Function uses `SECURITY DEFINER`
- [ ] Function uses `SET search_path = website_cms_template_dev, public` (prevents injection)
- [ ] Function queries custom schema table: `FROM website_cms_template_dev.your_table`
- [ ] Return type matches table columns exactly
- [ ] Execute permissions granted appropriately:
  - [ ] For public data: `GRANT EXECUTE ... TO anon, authenticated;`
  - [ ] For sensitive data: `GRANT EXECUTE ... TO authenticated;` (NOT anon)
- [ ] Functions use typed parameters (UUID, TEXT, etc.) - no dynamic SQL

**Functions to create:**
- [ ] `get_all_your_tables()` - Returns all records
- [ ] `get_your_table_by_id(UUID)` - Returns single record
- [ ] Additional functions as needed (filtered, search, etc.)

**Run in Supabase SQL Editor**

**Verify functions exist:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'get_%your_table%';
```

---

## Step 4: Update TypeScript Code

**File:** `src/lib/supabase/your-table.ts`

- [ ] Read operations use `.rpc()` not `.from()`
- [ ] Example: `await supabase.rpc("get_all_your_tables")`
- [ ] Write operations try `.from()` first
- [ ] If `.from()` fails with "table not found", create RPC functions for writes
- [ ] Error handling includes detailed logging
- [ ] Types match table structure

**Example pattern:**
```typescript
// ✅ CORRECT - Use RPC for reads
const { data } = await supabase.rpc("get_all_your_tables");

// ❌ WRONG - Don't use .from() for reads on new tables
const { data } = await supabase.from("your_table").select("*");
```

---

## Step 5: Verify Setup

- [ ] Schema is exposed: Dashboard → Settings → API → Exposed Schemas
- [ ] Table exists: `SELECT * FROM website_cms_template_dev.your_table LIMIT 1;`
- [ ] RPC functions exist: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_%your_table%';`
- [ ] RPC functions work: `SELECT * FROM public.get_all_your_tables();`

---

## Step 6: Test in Code

- [ ] Create test API route or component
- [ ] Call TypeScript functions
- [ ] Check browser console - no "table not found" errors
- [ ] Data loads correctly

---

## Troubleshooting

### Error: "Could not find the table 'public.your_table'"

**Fix:**
- [ ] Verify you're using RPC functions (`.rpc()`) not `.from()`
- [ ] Check RPC functions exist and have correct `SET search_path`
- [ ] Verify schema is exposed in Dashboard

### Error: "Could not find the function 'public.get_your_table'"

**Fix:**
- [ ] Run RPC migration again
- [ ] Check function exists in `public` schema
- [ ] Verify execute permissions granted

### RPC Function Returns Empty Array

**Fix:**
- [ ] Check RLS policies aren't blocking
- [ ] Test function SQL directly in SQL Editor
- [ ] Verify function query is correct

---

## Quick Reference: File Structure

```
supabase/migrations/
  ├── XXX_create_your_table.sql          (Step 1)
  ├── XXX_enable_rls_your_table.sql      (Step 2)
  └── XXX_create_your_table_rpc.sql      (Step 3) ⚠️ CRITICAL

src/lib/supabase/
  └── your-table.ts                      (Step 4)

src/types/
  └── your-table.ts                      (Type definitions)
```

---

## Why This Works

1. **RPC functions are in `public` schema** → PostgREST always finds them
2. **Functions use `SET search_path`** → PostgreSQL searches custom schema
3. **`SECURITY DEFINER`** → Function runs with elevated privileges
4. **Bypasses PostgREST schema search** → No more "table not found" errors

---

## Examples to Follow

- ✅ `settings` table → `get_setting()`, `get_settings()` functions
- ✅ `color_palettes` table → `get_color_palettes()`, `get_predefined_color_palettes()` functions

**See:** `supabase/migrations/008_create_settings_rpc.sql` and `018_create_color_palettes_rpc.sql` for complete examples.

---

## Security Notes

**The RPC function approach is SECURE when:**
- ✅ RLS is enabled and policies are properly configured
- ✅ `SET search_path` is explicitly set (prevents injection)
- ✅ Functions use typed parameters (no SQL injection)
- ✅ Execute permissions granted only to necessary roles
- ✅ For sensitive data, only grant to `authenticated` (not `anon`)

**RLS still applies:** Even with `SECURITY DEFINER`, RLS policies are evaluated for the caller, not the function owner.

**See:** `docs/SECURITY_RPC_FUNCTIONS.md` for complete security analysis.

---

## Remember

**For new tables added after initial setup:**
- ✅ Always create RPC functions
- ✅ Always use `.rpc()` for read operations
- ✅ Try `.from()` for writes first, create RPC if it fails
- ✅ Follow security best practices (RLS, SET search_path, typed parameters)

**This will save you hours of debugging!**
