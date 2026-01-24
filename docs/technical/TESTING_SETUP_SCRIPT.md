# Testing the Automated Client Setup Script

This guide walks you through testing the `pnpm setup-client` script with a test schema.

## Prerequisites

Before testing, ensure you have:
- ✅ `.env.local` file with Supabase credentials:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Access to Supabase Dashboard
- ✅ Terminal/command line access

## Test Schema Name

**Yes, you'll need a temporary test schema name.** Use something like:
- `test_client_setup` (recommended)
- `test_schema_001`
- `test_automation`

**Important**: Schema names must:
- Use only alphanumeric characters and underscores
- Not use hyphens (use underscores instead)
- Be unique (not already exist in your Supabase project)

## Step-by-Step Testing

### Step 1: Run the Setup Script

```bash
pnpm setup-client test_client_setup
```

**What to expect:**
- Script will create the schema
- Run all 6 migrations automatically
- Create storage bucket
- Refresh PostgREST cache

**Possible outcomes:**
- ✅ **Success**: All steps complete, shows summary
- ⚠️ **Partial success**: Some steps may need manual completion (if `exec_sql` RPC not available)
- ❌ **Error**: Check error message and see troubleshooting below

### Step 2: Verify Schema Creation

1. Go to Supabase Dashboard → **Table Editor**
2. Check if you see a schema dropdown with `test_client_setup`
3. Select the schema and verify tables exist:
   - `settings`
   - `posts`
   - `galleries`
   - `media`
   - `forms`
   - `integrations`
   - etc.

### Step 3: Verify RPC Functions

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query:

```sql
SELECT * FROM get_settings(ARRAY['design_system.theme', 'design_system.colors']);
```

**Expected result**: Should return 2 rows with theme and colors settings

### Step 4: Verify Default Settings

Run this query:

```sql
SELECT key, value FROM test_client_setup.settings 
WHERE key LIKE 'design_system.%' OR key LIKE 'site.%'
ORDER BY key;
```

**Expected result**: Should return 6 rows:
- `design_system.colors`
- `design_system.fonts.primary`
- `design_system.fonts.secondary`
- `design_system.theme`
- `site.description`
- `site.name`

### Step 5: Verify Storage Bucket

1. Go to Supabase Dashboard → **Storage**
2. Look for bucket: `client-test_client_setup`
3. Verify it exists and is public

### Step 6: Expose Schema (Manual Step)

**This step is always manual** (Supabase Dashboard doesn't have API for this):

1. Go to Supabase Dashboard → **Settings** → **API** → **Exposed Schemas**
2. Add `test_client_setup` to the comma-separated list
3. Click **Save**
4. Refresh PostgREST cache:

```sql
NOTIFY pgrst, 'reload schema';
```

### Step 7: Test Design System Loading

1. Update `.env.local` temporarily:
   ```env
   NEXT_PUBLIC_CLIENT_SCHEMA=test_client_setup
   ```

2. Restart dev server:
   ```bash
   # Stop current server (Ctrl+C)
   pnpm run dev
   ```

3. Visit `http://localhost:3000`
4. Check browser console - should be **no errors**
5. Open DevTools → Elements → Check `<html>` tag
6. Verify CSS variables are present:
   - `--color-primary`
   - `--font-primary`
   - etc.

### Step 8: Test Authentication

1. Create a test superadmin user with `tenant_id: test_client_setup`
2. Login at `http://localhost:3000/admin/login`
3. Verify dashboard loads
4. Check that design system is working

### Step 9: Clean Up (Optional)

After testing, you can either:
- **Keep the test schema** for future testing
- **Delete it** to clean up:

```sql
-- WARNING: This deletes all data in the schema!
DROP SCHEMA IF EXISTS test_client_setup CASCADE;

-- Also delete the storage bucket manually in Dashboard
```

## Troubleshooting

### Error: "RPC exec_sql not available"

**Cause**: Supabase project doesn't have `exec_sql` RPC function enabled.

**Solution**: 
- The script will warn you and provide manual SQL commands
- Run the migrations manually using the checklist
- This is expected for some Supabase projects

### Error: "Schema already exists"

**Cause**: Test schema name was already used.

**Solution**:
- Use a different test schema name
- Or drop the existing schema first (see cleanup above)

### Error: "Missing environment variables"

**Cause**: `.env.local` not configured or not loaded.

**Solution**:
- Verify `.env.local` exists in project root
- Check that variables are set correctly
- Restart terminal/IDE if needed

### Error: "Permission denied"

**Cause**: Service role key doesn't have sufficient permissions.

**Solution**:
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check Supabase project settings
- Ensure you're using the service role key (not anon key)

### Design System Not Loading

**Symptoms**: CSS variables missing, errors in console.

**Checklist**:
1. ✅ Schema is exposed in Dashboard
2. ✅ RPC functions exist (`get_settings`, `get_setting`, `set_setting`)
3. ✅ Settings table has data
4. ✅ `NEXT_PUBLIC_CLIENT_SCHEMA` matches schema name
5. ✅ PostgREST cache refreshed

## Success Criteria

The script test is successful if:
- ✅ Schema created without errors
- ✅ All tables exist in the schema
- ✅ RPC functions work (can query settings)
- ✅ Default settings inserted
- ✅ Storage bucket created
- ✅ Design system loads from database (no errors)
- ✅ Authentication works with test schema

## Next Steps After Successful Test

1. **Document any issues** found during testing
2. **Update script** if improvements needed
3. **Update checklist** if manual steps discovered
4. **Ready for real client setup** using the script

## Quick Test Command

```bash
# Run the script
pnpm setup-client test_client_setup

# Then verify (in Supabase SQL Editor)
SELECT COUNT(*) FROM test_client_setup.settings;  -- Should return 6

# Test RPC function
SELECT * FROM get_settings(ARRAY['design_system.theme']);  -- Should return 1 row
```
