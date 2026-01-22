# Security Analysis: RPC Functions Workaround

## Security Concerns and Mitigations

### ⚠️ Security Concerns

#### 1. **SECURITY DEFINER Functions**

**What it does:**
- Functions run with the privileges of the function owner (usually `postgres` or service role)
- Allows functions to access tables in custom schemas that the caller might not have direct access to

**Security Risk:**
- Functions run with elevated privileges
- Could potentially bypass some access controls if not properly configured

**Mitigation:**
- ✅ **RLS still applies** - Row Level Security policies are evaluated in the context of the **caller**, not the function owner
- ✅ **SET search_path** - Prevents search_path injection attacks
- ✅ **Read-only functions** - Our functions only perform SELECT queries, no writes
- ✅ **Explicit schema** - Functions explicitly query `website_cms_template_dev.table`, not dynamic schema resolution

---

#### 2. **RLS with SECURITY DEFINER**

**How it works:**
- When a `SECURITY DEFINER` function executes, PostgreSQL evaluates RLS policies based on the **caller's** role, not the function owner's role
- This means RLS policies still apply and restrict access appropriately

**Verification:**
```sql
-- Test: RLS should still apply
-- If anon user calls the function, RLS policies for 'anon' role apply
-- If authenticated user calls, RLS policies for 'authenticated' role apply
```

**Our Implementation:**
- ✅ RLS is enabled on all tables
- ✅ Policies are created for both `anon` and `authenticated` roles
- ✅ Functions respect these policies

---

#### 3. **Granting Execute to `anon` Role**

**Current Implementation:**
```sql
GRANT EXECUTE ON FUNCTION public.get_color_palettes() TO anon;
GRANT EXECUTE ON FUNCTION public.get_predefined_color_palettes() TO anon;
```

**Security Risk:**
- Anonymous users can call these functions
- Functions return data based on RLS policies

**Mitigation:**
- ✅ **RLS policies restrict access** - For `color_palettes`, `anon` can only read `is_predefined = true` records
- ✅ **No sensitive data exposed** - Color palettes are not sensitive
- ✅ **Can be restricted** - If needed, remove `anon` grants and only grant to `authenticated`

**Recommendation:**
- For sensitive tables, only grant to `authenticated`:
  ```sql
  GRANT EXECUTE ON FUNCTION public.get_sensitive_data() TO authenticated;
  -- Do NOT grant to anon
  ```

---

#### 4. **SQL Injection Risk**

**Current Implementation:**
- Functions use parameterized queries or hardcoded queries
- No dynamic SQL construction from user input

**Example (Safe):**
```sql
-- Safe: Parameter is properly typed
CREATE FUNCTION get_color_palette_by_id(palette_id UUID)
-- UUID type prevents injection
```

**Risk Level:** ✅ **LOW** - No user input directly in SQL

---

#### 5. **SET search_path Injection**

**What it prevents:**
- Attackers can't manipulate the schema search path
- Prevents creating malicious functions/tables in `public` schema that could be executed

**Our Implementation:**
```sql
SET search_path = website_cms_template_dev, public
```

**Security:**
- ✅ **Explicit schema** - We explicitly set the search path
- ✅ **No user input** - Search path is hardcoded, not dynamic
- ✅ **Best practice** - This is the recommended approach for SECURITY DEFINER functions

---

## Security Best Practices We're Following

### ✅ 1. RLS is Enabled and Enforced
- All tables have RLS enabled
- Policies are created for appropriate roles
- RLS policies are evaluated even with SECURITY DEFINER functions

### ✅ 2. Principle of Least Privilege
- Functions only return data needed (specific columns)
- Read-only functions (SELECT only, no INSERT/UPDATE/DELETE)
- Execute permissions granted only to necessary roles

### ✅ 3. Input Validation
- Functions use typed parameters (UUID, TEXT, etc.)
- No dynamic SQL construction
- Schema names are hardcoded, not user input

### ✅ 4. Search Path Protection
- `SET search_path` prevents injection attacks
- Explicit schema qualification in queries

### ✅ 5. Function Isolation
- Functions are in `public` schema (required for PostgREST)
- Functions query custom schema (data isolation maintained)
- No cross-schema data leakage

---

## Security Recommendations

### For Sensitive Tables

**1. Restrict to Authenticated Users Only:**
```sql
-- Only grant to authenticated, NOT anon
GRANT EXECUTE ON FUNCTION public.get_sensitive_data() TO authenticated;
-- Do NOT include: TO anon
```

**2. Add Additional RLS Conditions:**
```sql
-- More restrictive RLS policy
CREATE POLICY "Restrict sensitive data"
  ON website_cms_template_dev.sensitive_table
  FOR SELECT
  TO authenticated
  USING (
    -- Add conditions: user_id matches, role check, etc.
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

**3. Audit Function Calls:**
```sql
-- Add logging to sensitive functions
CREATE OR REPLACE FUNCTION public.get_sensitive_data()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = website_cms_template_dev, public
AS $$
BEGIN
  -- Log the access
  INSERT INTO audit_log (user_id, action, table_name, accessed_at)
  VALUES (auth.uid(), 'SELECT', 'sensitive_table', NOW());
  
  RETURN QUERY
  SELECT * FROM website_cms_template_dev.sensitive_table
  WHERE ...; -- RLS policies apply here
END;
$$;
```

---

## Comparison: Direct Access vs RPC Functions

### Direct Access (`.from()`)
- ✅ Simpler code
- ✅ PostgREST handles RLS automatically
- ❌ Doesn't work for new tables (PostgREST can't find them)

### RPC Functions (`.rpc()`)
- ✅ Works reliably for all tables
- ✅ RLS still applies (evaluated for caller)
- ✅ More control over what data is returned
- ⚠️ Requires creating functions (more setup)
- ⚠️ SECURITY DEFINER requires careful configuration

**Security Level:** Both approaches are equally secure when properly configured.

---

## Verification Checklist

When creating RPC functions, verify:

- [ ] RLS is enabled on the table
- [ ] RLS policies are created for appropriate roles
- [ ] `SET search_path` is explicitly set (prevents injection)
- [ ] Functions use typed parameters (no dynamic SQL)
- [ ] Execute permissions granted only to necessary roles
- [ ] For sensitive data, only grant to `authenticated` (not `anon`)
- [ ] Functions are read-only (SELECT only) unless writes are necessary
- [ ] Schema names are hardcoded, not user input

---

## Current Implementation Security Status

### ✅ Color Palettes Functions
- **Security Level:** ✅ **SAFE**
- **Reason:** 
  - Read-only functions
  - RLS restricts `anon` to predefined palettes only
  - No sensitive data
  - Proper `SET search_path`

### ✅ Settings Functions
- **Security Level:** ✅ **SAFE**
- **Reason:**
  - Read-only functions
  - RLS policies restrict access
  - No sensitive data exposed
  - Proper `SET search_path`

---

## Conclusion

**The RPC function workaround is SECURE when:**
1. ✅ RLS is enabled and policies are properly configured
2. ✅ `SET search_path` is explicitly set
3. ✅ Functions use typed parameters (no SQL injection)
4. ✅ Execute permissions are granted only to necessary roles
5. ✅ Functions are read-only or properly validate writes

**Security is maintained because:**
- RLS policies still apply (evaluated for the caller, not function owner)
- No SQL injection vectors (typed parameters, explicit schemas)
- Search path injection prevented (`SET search_path`)
- Principle of least privilege (only necessary permissions granted)

**For sensitive tables:**
- Only grant execute to `authenticated` (not `anon`)
- Add additional RLS conditions
- Consider audit logging

**The workaround is production-ready and secure** when following these practices.
